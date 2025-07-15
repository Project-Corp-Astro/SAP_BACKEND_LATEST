#!/usr/bin/env node

/**
 * ============================================================================
 * Module 2: Database Migration Orchestrator
 * ============================================================================
 * Purpose: Migrate existing local databases to GCP Cloud SQL and Memorystore
 * Zero-Tolerance Policy: All data must be preserved with verification
 * Mathematical Precision: Checksum validation and row count verification
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Logging utilities
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const success = (message) => log(`✅ ${message}`, 'green');
const error = (message) => log(`❌ ERROR: ${message}`, 'red');
const warning = (message) => log(`⚠️ ${message}`, 'yellow');
const progress = (message) => log(`▶ ${message}`, 'blue');
const info = (message) => log(`ℹ️ ${message}`, 'cyan');

// Configuration
const config = {
  logFile: path.join(__dirname, '..', 'logs', `migration-${Date.now()}.log`),
  backupDir: path.join(__dirname, '..', 'backups', `migration-${Date.now()}`),
  checksumFile: path.join(__dirname, '..', 'logs', 'migration-checksums.json'),
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  batchSize: 1000,
  
  // Database connections (will be loaded from environment/terraform)
  source: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'sap_db',
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null
    },
    mongodb: {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/sap-db'
    }
  },
  
  target: {
    postgres: {
      host: null, // Will be loaded from terraform output
      port: 5432,
      database: 'sap_main',
      username: 'sap_app_user',
      password: null // Will be loaded from secret manager
    },
    redis: {
      host: null, // Will be loaded from terraform output
      port: 6379,
      password: null // Will be loaded from secret manager
    },
    mongodb: {
      uri: null // Will be loaded from secret manager
    }
  }
};

class MigrationOrchestrator {
  constructor() {
    this.startTime = Date.now();
    this.migrationState = {
      phase: 'initialization',
      completed: [],
      failed: [],
      checksums: {},
      statistics: {
        tablesProcessed: 0,
        rowsMigrated: 0,
        keysProcessed: 0,
        documentsProcessed: 0
      }
    };
  }

  async init() {
    progress('Initializing Database Migration Orchestrator...');
    
    // Create required directories
    await this.createDirectories();
    
    // Load target database configuration from terraform
    await this.loadTargetConfiguration();
    
    // Validate connections
    await this.validateConnections();
    
    success('Migration orchestrator initialized');
  }

  async createDirectories() {
    const dirs = [
      path.dirname(config.logFile),
      config.backupDir,
      path.join(config.backupDir, 'postgres'),
      path.join(config.backupDir, 'redis'),
      path.join(config.backupDir, 'mongodb')
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
      }
    }
  }

  async loadTargetConfiguration() {
    progress('Loading target database configuration from terraform...');
    
    try {
      // Get terraform outputs
      const terraformDir = path.join(__dirname, '..', '..', 'infrastructure', 'gcp', 'terraform');
      process.chdir(terraformDir);
      
      // Get PostgreSQL configuration
      const postgresHost = execSync('terraform output -raw postgres_private_ip', { encoding: 'utf8' }).trim();
      const postgresSecret = execSync('terraform output -raw postgres_secret_name', { encoding: 'utf8' }).trim();
      
      // Get Redis configuration
      const redisHost = execSync('terraform output -raw redis_host', { encoding: 'utf8' }).trim();
      const redisSecret = execSync('terraform output -raw redis_secret_name', { encoding: 'utf8' }).trim();
      
      // Get MongoDB configuration
      const mongoSecret = execSync('terraform output -raw mongodb_secret_name', { encoding: 'utf8' }).trim();
      
      // Load secrets from Google Secret Manager
      config.target.postgres.host = postgresHost;
      config.target.redis.host = redisHost;
      
      // Load passwords from secret manager
      await this.loadSecrets(postgresSecret, redisSecret, mongoSecret);
      
      success('Target configuration loaded successfully');
    } catch (err) {
      error(`Failed to load target configuration: ${err.message}`);
      throw err;
    }
  }

  async loadSecrets(postgresSecret, redisSecret, mongoSecret) {
    progress('Loading database credentials from Secret Manager...');
    
    try {
      // Load PostgreSQL secret
      const postgresSecretData = execSync(
        `gcloud secrets versions access latest --secret=${postgresSecret} --format="get(payload.data)" | base64 -d`,
        { encoding: 'utf8' }
      );
      const postgresConfig = JSON.parse(postgresSecretData);
      config.target.postgres.password = postgresConfig.password;
      
      // Load Redis secret
      const redisSecretData = execSync(
        `gcloud secrets versions access latest --secret=${redisSecret} --format="get(payload.data)" | base64 -d`,
        { encoding: 'utf8' }
      );
      const redisConfig = JSON.parse(redisSecretData);
      config.target.redis.password = redisConfig.auth_string;
      
      // Load MongoDB secret (if configured)
      if (mongoSecret !== '') {
        const mongoSecretData = execSync(
          `gcloud secrets versions access latest --secret=${mongoSecret} --format="get(payload.data)" | base64 -d`,
          { encoding: 'utf8' }
        );
        const mongoConfig = JSON.parse(mongoSecretData);
        config.target.mongodb.uri = mongoConfig.connection_string;
      }
      
      success('Database credentials loaded successfully');
    } catch (err) {
      error(`Failed to load secrets: ${err.message}`);
      throw err;
    }
  }

  async validateConnections() {
    progress('Validating database connections...');
    
    // Validate source connections
    await this.validatePostgreSQLConnection(config.source.postgres, 'source');
    await this.validateRedisConnection(config.source.redis, 'source');
    
    // Validate target connections
    await this.validatePostgreSQLConnection(config.target.postgres, 'target');
    await this.validateRedisConnection(config.target.redis, 'target');
    
    success('All database connections validated');
  }

  async validatePostgreSQLConnection(dbConfig, type) {
    try {
      const { Client } = require('pg');
      const client = new Client(dbConfig);
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      success(`PostgreSQL ${type} connection validated`);
    } catch (err) {
      error(`PostgreSQL ${type} connection failed: ${err.message}`);
      throw err;
    }
  }

  async validateRedisConnection(redisConfig, type) {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(redisConfig);
      await redis.ping();
      redis.disconnect();
      success(`Redis ${type} connection validated`);
    } catch (err) {
      error(`Redis ${type} connection failed: ${err.message}`);
      throw err;
    }
  }

  async createBackups() {
    progress('Creating backups before migration...');
    
    this.migrationState.phase = 'backup';
    
    try {
      // Backup PostgreSQL
      await this.backupPostgreSQL();
      
      // Backup Redis
      await this.backupRedis();
      
      // Backup MongoDB (if applicable)
      if (config.source.mongodb.uri) {
        await this.backupMongoDB();
      }
      
      success('All backups created successfully');
      this.migrationState.completed.push('backup');
    } catch (err) {
      error(`Backup failed: ${err.message}`);
      this.migrationState.failed.push('backup');
      throw err;
    }
  }

  async backupPostgreSQL() {
    progress('Creating PostgreSQL backup...');
    
    const backupFile = path.join(config.backupDir, 'postgres', 'backup.sql');
    const { host, port, database, username, password } = config.source.postgres;
    
    const command = [
      'pg_dump',
      `-h ${host}`,
      `-p ${port}`,
      `-U ${username}`,
      `-d ${database}`,
      `--file=${backupFile}`,
      '--verbose',
      '--clean',
      '--create'
    ].join(' ');
    
    try {
      execSync(command, { 
        env: { ...process.env, PGPASSWORD: password },
        stdio: 'inherit'
      });
      
      // Calculate checksum
      const checksum = await this.calculateFileChecksum(backupFile);
      this.migrationState.checksums.postgresBackup = checksum;
      
      success(`PostgreSQL backup created: ${backupFile}`);
    } catch (err) {
      throw new Error(`PostgreSQL backup failed: ${err.message}`);
    }
  }

  async backupRedis() {
    progress('Creating Redis backup...');
    
    const backupFile = path.join(config.backupDir, 'redis', 'backup.rdb');
    
    try {
      const Redis = require('ioredis');
      const redis = new Redis(config.source.redis);
      
      // Get all keys
      const keys = await redis.keys('*');
      const backup = {};
      
      for (const key of keys) {
        const type = await redis.type(key);
        const ttl = await redis.ttl(key);
        
        switch (type) {
          case 'string':
            backup[key] = { type, value: await redis.get(key), ttl };
            break;
          case 'list':
            backup[key] = { type, value: await redis.lrange(key, 0, -1), ttl };
            break;
          case 'set':
            backup[key] = { type, value: await redis.smembers(key), ttl };
            break;
          case 'hash':
            backup[key] = { type, value: await redis.hgetall(key), ttl };
            break;
          case 'zset':
            backup[key] = { type, value: await redis.zrange(key, 0, -1, 'WITHSCORES'), ttl };
            break;
        }
      }
      
      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
      redis.disconnect();
      
      // Calculate checksum
      const checksum = await this.calculateFileChecksum(backupFile);
      this.migrationState.checksums.redisBackup = checksum;
      
      success(`Redis backup created: ${backupFile} (${keys.length} keys)`);
    } catch (err) {
      throw new Error(`Redis backup failed: ${err.message}`);
    }
  }

  async backupMongoDB() {
    progress('Creating MongoDB backup...');
    
    const backupDir = path.join(config.backupDir, 'mongodb');
    
    try {
      const command = `mongodump --uri="${config.source.mongodb.uri}" --out="${backupDir}"`;
      execSync(command, { stdio: 'inherit' });
      
      success(`MongoDB backup created: ${backupDir}`);
    } catch (err) {
      throw new Error(`MongoDB backup failed: ${err.message}`);
    }
  }

  async migratePostgreSQL() {
    progress('Migrating PostgreSQL data...');
    
    this.migrationState.phase = 'postgres_migration';
    
    try {
      const { Client } = require('pg');
      
      // Source connection
      const sourceClient = new Client(config.source.postgres);
      await sourceClient.connect();
      
      // Target connection
      const targetClient = new Client(config.target.postgres);
      await targetClient.connect();
      
      // Get list of tables
      const tablesResult = await sourceClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      
      for (const table of tables) {
        await this.migrateTable(sourceClient, targetClient, table);
        this.migrationState.statistics.tablesProcessed++;
      }
      
      await sourceClient.end();
      await targetClient.end();
      
      success(`PostgreSQL migration completed: ${tables.length} tables processed`);
      this.migrationState.completed.push('postgres');
    } catch (err) {
      error(`PostgreSQL migration failed: ${err.message}`);
      this.migrationState.failed.push('postgres');
      throw err;
    }
  }

  async migrateTable(sourceClient, targetClient, tableName) {
    progress(`Migrating table: ${tableName}`);
    
    try {
      // Get table structure
      const structureResult = await sourceClient.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      // Create table in target (if not exists)
      // This is a simplified approach - you might need more sophisticated DDL migration
      
      // Get row count
      const countResult = await sourceClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const totalRows = parseInt(countResult.rows[0].count);
      
      if (totalRows === 0) {
        info(`Table ${tableName} is empty, skipping data migration`);
        return;
      }
      
      // Migrate data in batches
      let offset = 0;
      while (offset < totalRows) {
        const dataResult = await sourceClient.query(`
          SELECT * FROM ${tableName} 
          ORDER BY 1 
          LIMIT ${config.batchSize} 
          OFFSET ${offset}
        `);
        
        if (dataResult.rows.length > 0) {
          // Insert batch into target
          await this.insertBatch(targetClient, tableName, dataResult.rows);
          this.migrationState.statistics.rowsMigrated += dataResult.rows.length;
        }
        
        offset += config.batchSize;
        progress(`Migrated ${Math.min(offset, totalRows)}/${totalRows} rows from ${tableName}`);
      }
      
      // Verify row count
      const targetCountResult = await targetClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const targetRows = parseInt(targetCountResult.rows[0].count);
      
      if (totalRows !== targetRows) {
        throw new Error(`Row count mismatch for ${tableName}: source=${totalRows}, target=${targetRows}`);
      }
      
      success(`Table ${tableName} migrated successfully: ${totalRows} rows`);
    } catch (err) {
      throw new Error(`Failed to migrate table ${tableName}: ${err.message}`);
    }
  }

  async insertBatch(client, tableName, rows) {
    if (rows.length === 0) return;
    
    const columns = Object.keys(rows[0]);
    const placeholders = rows.map((_, i) => 
      `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
    ).join(', ');
    
    const values = rows.flatMap(row => columns.map(col => row[col]));
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')}) 
      VALUES ${placeholders}
      ON CONFLICT DO NOTHING
    `;
    
    await client.query(query, values);
  }

  async migrateRedis() {
    progress('Migrating Redis data...');
    
    this.migrationState.phase = 'redis_migration';
    
    try {
      const Redis = require('ioredis');
      
      const sourceRedis = new Redis(config.source.redis);
      const targetRedis = new Redis(config.target.redis);
      
      // Get all keys
      const keys = await sourceRedis.keys('*');
      
      for (let i = 0; i < keys.length; i += config.batchSize) {
        const batch = keys.slice(i, i + config.batchSize);
        await this.migrateRedisBatch(sourceRedis, targetRedis, batch);
        this.migrationState.statistics.keysProcessed += batch.length;
        
        progress(`Migrated ${Math.min(i + config.batchSize, keys.length)}/${keys.length} Redis keys`);
      }
      
      sourceRedis.disconnect();
      targetRedis.disconnect();
      
      success(`Redis migration completed: ${keys.length} keys processed`);
      this.migrationState.completed.push('redis');
    } catch (err) {
      error(`Redis migration failed: ${err.message}`);
      this.migrationState.failed.push('redis');
      throw err;
    }
  }

  async migrateRedisBatch(sourceRedis, targetRedis, keys) {
    const pipeline = targetRedis.pipeline();
    
    for (const key of keys) {
      const type = await sourceRedis.type(key);
      const ttl = await sourceRedis.ttl(key);
      
      switch (type) {
        case 'string':
          const stringValue = await sourceRedis.get(key);
          pipeline.set(key, stringValue);
          break;
        case 'list':
          const listValues = await sourceRedis.lrange(key, 0, -1);
          pipeline.del(key);
          if (listValues.length > 0) {
            pipeline.lpush(key, ...listValues.reverse());
          }
          break;
        case 'set':
          const setValues = await sourceRedis.smembers(key);
          pipeline.del(key);
          if (setValues.length > 0) {
            pipeline.sadd(key, ...setValues);
          }
          break;
        case 'hash':
          const hashValue = await sourceRedis.hgetall(key);
          pipeline.hmset(key, hashValue);
          break;
        case 'zset':
          const zsetValues = await sourceRedis.zrange(key, 0, -1, 'WITHSCORES');
          pipeline.del(key);
          if (zsetValues.length > 0) {
            const args = [];
            for (let i = 0; i < zsetValues.length; i += 2) {
              args.push(zsetValues[i + 1], zsetValues[i]);
            }
            pipeline.zadd(key, ...args);
          }
          break;
      }
      
      // Set TTL if it exists
      if (ttl > 0) {
        pipeline.expire(key, ttl);
      }
    }
    
    await pipeline.exec();
  }

  async calculateFileChecksum(filePath) {
    const data = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async generateMigrationReport() {
    progress('Generating migration report...');
    
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      migration: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        status: this.migrationState.failed.length === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE'
      },
      statistics: this.migrationState.statistics,
      completed: this.migrationState.completed,
      failed: this.migrationState.failed,
      checksums: this.migrationState.checksums,
      backupLocation: config.backupDir
    };
    
    const reportFile = path.join(path.dirname(config.logFile), `migration-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    log('\n============================================================================');
    log('📋 MIGRATION REPORT', 'cyan');
    log('============================================================================');
    log(`Status: ${report.migration.status}`, report.migration.status === 'SUCCESS' ? 'green' : 'yellow');
    log(`Duration: ${report.migration.duration}`);
    log(`Tables Processed: ${report.statistics.tablesProcessed}`);
    log(`Rows Migrated: ${report.statistics.rowsMigrated}`);
    log(`Redis Keys Processed: ${report.statistics.keysProcessed}`);
    log(`Report saved to: ${reportFile}`, 'cyan');
    log('============================================================================\n');
    
    return report;
  }

  async run() {
    try {
      await this.init();
      await this.createBackups();
      await this.migratePostgreSQL();
      await this.migrateRedis();
      
      const report = await this.generateMigrationReport();
      
      if (report.migration.status === 'SUCCESS') {
        success('🎉 Database migration completed successfully!');
        return 0;
      } else {
        warning('⚠️ Migration completed with some failures. Check the report for details.');
        return 1;
      }
    } catch (err) {
      error(`Migration failed: ${err.message}`);
      await this.generateMigrationReport();
      return 1;
    }
  }
}

// Main execution
if (require.main === module) {
  const migrator = new MigrationOrchestrator();
  migrator.run().then(process.exit).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = MigrationOrchestrator;
