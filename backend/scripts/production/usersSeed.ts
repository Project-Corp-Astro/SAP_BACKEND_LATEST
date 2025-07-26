// scripts/seedUsers.ts
import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as bcrypt from 'bcryptjs';

// Load .env variables
config({ path: resolve(__dirname, '../../.env') });

interface IUser {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  avatar: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin: Date;
  roles: ObjectId[];
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: { email: boolean; push: boolean };
    language: string;
    timezone: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  devices?: Array<{
    deviceId: string;
    deviceName: string;
    deviceType: string;
    os?: string;
    browser?: string;
    ipAddress?: string;
    lastUsed: Date;
    isTrusted: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const randomDate = (start: Date, end: Date) =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const baseUser = (role: string, index: number) => {
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const roleName = role.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

  return {
    username: `${role}${index}`,
    email: `${role}${index}@example.com`,
    password: `${role.charAt(0).toUpperCase() + role.slice(1)}@123`,
    firstName: roleName,
    lastName: `User ${index}`,
    phoneNumber: `+1${5550000000 + index * 100 + (role.charCodeAt(0) % 100)}`,
    avatar: `https://ui-avatars.com/api/?name=${roleName}+User+${index}&background=random`,
    isActive: true,
    isEmailVerified: true,
    lastLogin: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
    preferences: {
      theme: isSuperAdmin ? 'dark' : isAdmin ? 'system' : 'light',
      notifications: { email: true, push: isAdmin },
      language: 'en',
      timezone: isSuperAdmin ? 'UTC' : 'America/New_York'
    },
    ...(isAdmin && {
      address: {
        street: `${index} ${roleName} St`,
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA'
      }
    }),
    ...(isSuperAdmin && {
      devices: [{
        deviceId: `dev-${role}-${index}`,
        deviceName: `${roleName} Device ${index}`,
        deviceType: 'desktop',
        os: 'Windows 11',
        browser: 'Chrome',
        ipAddress: `192.168.1.${100 + index}`,
        lastUsed: new Date(),
        isTrusted: true
      }]
    }),
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

const roleToUsersMap = {
  'super_admin': [1, 2].map(i => baseUser('super_admin', i)),
  'admin': [1, 2].map(i => baseUser('admin', i)),
  'subscription_manager': [1, 2].map(i => baseUser('subscription_manager', i)),
  'subscription_analytics': [1, 2].map(i => baseUser('subscription_analytics', i)),
  'content_manager': [1, 2].map(i => baseUser('content_manager', i)),
  'support_agent': [1, 2].map(i => baseUser('support_agent', i)),
  'user': [1, 2].map(i => baseUser('user', i))
};

const usersToSeed = Object.entries(roleToUsersMap).flatMap(([role, users]) =>
  users.map(user => ({ ...user, role }))
);

async function seedUsers() {
  const mongoUri = 'mongodb+srv://theja4386:SaiTeja%40123@sap-backend-cluster.zlzcxpz.mongodb.net/users_db?retryWrites=true&w=majority';
  if (!mongoUri) {
    console.error('❌ MONGO_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 30000 });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const dbName = new URL(mongoUri).pathname.substring(1); // extract DB name from URI
    const db = client.db(dbName);

    const usersCollection = db.collection('users');
    const rolesCollection = db.collection('rolepermissions');

    const deleteResult = await usersCollection.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing users`);

    const allRoles = await rolesCollection.find({}).toArray();
    if (allRoles.length === 0) throw new Error('❌ No roles found. Please seed roles first.');

    const roleMap = new Map(allRoles.map(r => [r.role, r._id]));

    const hashedUsers = await Promise.all(usersToSeed.map(async user => {
      const roleId = roleMap.get(user.role);
      if (!roleId) {
        console.warn(`⚠️ Role ${user.role} not found`);
        return null;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      const { role, ...userData } = user;

      return {
        ...userData,
        password: hashedPassword,
        roles: [roleId],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }));

    const validUsers = hashedUsers.filter(Boolean) as any[];

    const insertResult = await usersCollection.insertMany(validUsers);
    console.log(`✅ Inserted ${insertResult.insertedCount} users`);

    const createdUsers = await usersCollection.aggregate([
      { $lookup: {
          from: 'rolepermissions',
          localField: 'roles',
          foreignField: '_id',
          as: 'roleDetails'
        }},
      { $project: {
          username: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          phoneNumber: 1,
          roles: '$roleDetails.role'
        }}
    ]).toArray();

    console.log('\n🧾 Seeded Users:\n');
    console.table(createdUsers.map(u => ({
      username: u.username,
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
      phone: u.phoneNumber,
      roles: u.roles.join(', ')
    })));

  } catch (err) {
    console.error('❌ Error seeding users:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedUsers()
  .then(() => console.log('\n🎉 User seeding completed successfully'))
  .catch(console.error);
