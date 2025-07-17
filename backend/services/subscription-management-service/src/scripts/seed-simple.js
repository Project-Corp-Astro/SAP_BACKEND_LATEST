"use strict";
/**
 * Simple Database Seeder Script
 *
 * This script populates the database with test data for development and testing purposes.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../db/data-source");
const App_entity_1 = require("../entities/App.entity");
const PlanFeature_entity_1 = require("../entities/PlanFeature.entity");
const Payment_entity_1 = require("../entities/Payment.entity");
const PromoCode_entity_1 = require("../entities/PromoCode.entity");
const Subscription_entity_1 = require("../entities/Subscription.entity");
const SubscriptionPlan_entity_1 = require("../entities/SubscriptionPlan.entity");
const SubscriptionPromoCode_entity_1 = require("../entities/SubscriptionPromoCode.entity");
const logger_1 = __importDefault(require("../utils/logger"));
// Helper function to generate UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// Generate fake user IDs for testing with proper UUID format
const fakeUserIds = Array.from({ length: 10 }, generateUUID);
function seedDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logger_1.default.info('Starting database seeding...');
            // Initialize the database connection
            yield (0, data_source_1.initializeDatabase)();
            // Clear existing data from tables with proper foreign key handling
            try {
                logger_1.default.info('Clearing existing data with proper foreign key handling...');
                const tables = yield data_source_1.AppDataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
                // Disable foreign key checks temporarily
                yield data_source_1.AppDataSource.query('SET CONSTRAINTS ALL DEFERRED');
                // Clear tables in reverse dependency order if they exist
                const tableNames = tables.map(row => row.table_name);
                // Clear tables in reverse dependency order if they exist
                if (tableNames.includes('payment'))
                    yield data_source_1.AppDataSource.query('TRUNCATE TABLE payment RESTART IDENTITY CASCADE');
                if (tableNames.includes('plan_feature'))
                    yield data_source_1.AppDataSource.query('TRUNCATE TABLE plan_feature RESTART IDENTITY CASCADE');
                if (tableNames.includes('subscription'))
                    yield data_source_1.AppDataSource.query('TRUNCATE TABLE subscription RESTART IDENTITY CASCADE');
                if (tableNames.includes('subscription_plan'))
                    yield data_source_1.AppDataSource.query('TRUNCATE TABLE subscription_plan RESTART IDENTITY CASCADE');
                if (tableNames.includes('promo_code'))
                    yield data_source_1.AppDataSource.query('TRUNCATE TABLE promo_code RESTART IDENTITY CASCADE');
                if (tableNames.includes('app'))
                    yield data_source_1.AppDataSource.query('TRUNCATE TABLE app RESTART IDENTITY CASCADE');
                // Re-enable foreign key checks
                yield data_source_1.AppDataSource.query('SET CONSTRAINTS ALL IMMEDIATE');
                logger_1.default.info('Existing tables cleared successfully');
            }
            catch (error) {
                logger_1.default.error('Error clearing tables:', error);
                throw error;
            }
            // Create a timestamp to ensure unique names
            const timestamp = Date.now();
            const mockAppsData = [
                {
                    name: 'Corp Astro',
                    color: '#8952e0',
                    logo: 'StarOutlined',
                    totalPlans: 3,
                    description: 'Corporate Astrology Platform',
                    owner: 'corpastro@example.com',
                    website: 'https://corpastro.com'
                },
                {
                    name: 'Mobile Astrology',
                    color: '#1890ff',
                    logo: 'MobileOutlined',
                    totalPlans: 2,
                    description: 'Mobile Astrology App',
                    owner: 'mobileastro@example.com',
                    website: 'https://mobileastro.com'
                },
                {
                    name: 'Vedic Calendar',
                    color: '#fa8c16',
                    logo: 'CalendarOutlined',
                    totalPlans: 2,
                    description: 'Vedic Calendar Application',
                    owner: 'vediccalendar@example.com',
                    website: 'https://vediccalendar.com'
                },
                {
                    name: 'Astro Cloud',
                    color: '#13c2c2',
                    logo: 'CloudOutlined',
                    totalPlans: 2,
                    description: 'Cloud Astrology Services',
                    owner: 'astrocloud@example.com',
                    website: 'https://astrocloud.com'
                },
                {
                    name: 'Astro Learn',
                    color: '#52c41a',
                    logo: 'BulbOutlined',
                    totalPlans: 2,
                    description: 'Astrology Learning Platform',
                    owner: 'astrolearn@example.com',
                    website: 'https://astrolearn.com'
                },
                {
                    name: 'Astro Business',
                    color: '#f5222d',
                    logo: 'RocketOutlined',
                    totalPlans: 2,
                    description: 'Business Astrology Solutions',
                    owner: 'astrobusiness@example.com',
                    website: 'https://astrobusiness.com'
                }
            ];
            logger_1.default.info('Creating App records...');
            const apps = [];
            for (const appData of mockAppsData) {
                const app = new App_entity_1.App();
                app.id = generateUUID();
                app.name = appData.name;
                app.description = appData.description;
                app.owner = appData.owner;
                app.logo = appData.logo;
                app.website = appData.website;
                app.color = appData.color;
                app.totalPlans = appData.totalPlans;
                const savedApp = yield data_source_1.AppDataSource.manager.save(app);
                apps.push(savedApp);
                logger_1.default.info(`Created app: ${savedApp.name} (${savedApp.id})`);
            }
            // 2. Create Subscription Plans (10)
            logger_1.default.info('Creating SubscriptionPlan records...');
            const plans = [];
            const planNames = [
                'Basic', 'Standard', 'Premium', 'Enterprise',
                'Starter', 'Professional', 'Ultimate', 'Bronze',
                'Silver', 'Gold'
            ];
            // Add timestamp to plan names for uniqueness
            const uniquePlanNames = planNames.map(name => `${name}-${timestamp}`);
            for (let i = 0; i < 10; i++) {
                const plan = new SubscriptionPlan_entity_1.SubscriptionPlan();
                plan.name = uniquePlanNames[i];
                plan.description = `${planNames[i]} plan with great features`;
                plan.price = (999 + (i * 1000)) / 100;
                plan.annualPrice = plan.price * 10;
                plan.discountPercentage = 10 + (i * 2);
                plan.billingCycle = i % 3 === 0 ? SubscriptionPlan_entity_1.BillingCycle.MONTHLY :
                    i % 3 === 1 ? SubscriptionPlan_entity_1.BillingCycle.QUARTERLY :
                        SubscriptionPlan_entity_1.BillingCycle.YEARLY;
                plan.appId = apps[i % apps.length].id;
                plan.app = apps[i % apps.length];
                plan.trialDays = (i % 3) * 10;
                plan.status = i < 7 ? SubscriptionPlan_entity_1.PlanStatus.ACTIVE :
                    i === 7 ? SubscriptionPlan_entity_1.PlanStatus.DRAFT :
                        SubscriptionPlan_entity_1.PlanStatus.ARCHIVED;
                plan.highlight = i < 3 ? 'Popular Choice' : '';
                plan.sortPosition = i;
                plan.version = 1;
                plan.effectiveDate = new Date();
                plan.maxUsers = (i + 1) * 10;
                plan.enterprisePricing = i === 9;
                plan.currency = '₹';
                const savedPlan = yield data_source_1.AppDataSource.manager.save(plan);
                plans.push(savedPlan);
                logger_1.default.info(`Created plan: ${savedPlan.name} (${savedPlan.id})`);
            }
            // 3. Create Plan Features (40)
            logger_1.default.info('Creating PlanFeature records...');
            const features = [];
            const featureOptions = [
                'Unlimited access', 'Priority support', 'Ad-free experience',
                'Premium content', 'Custom exports', 'API access',
                'Advanced analytics', 'Team collaboration', 'White labeling',
                'Custom domain', 'Email support', 'Phone support',
                'Multiple users', 'Offline access', 'Custom reports'
            ];
            let featureCount = 0;
            for (const plan of plans) {
                // Add 4 features per plan
                for (let i = 0; i < 4; i++) {
                    const feature = new PlanFeature_entity_1.PlanFeature();
                    feature.name = featureOptions[(featureCount + i) % featureOptions.length];
                    feature.planId = plan.id;
                    feature.included = (i < 3); // First 3 features included, last one optional
                    feature.limit = (i * 10);
                    feature.category = ['Core', 'Support', 'Advanced', 'Add-on'][i % 4];
                    feature.description = `${feature.name} for ${plan.name} plan`;
                    feature.isPopular = (i === 0);
                    const savedFeature = yield data_source_1.AppDataSource.manager.save(feature);
                    features.push(savedFeature);
                }
                featureCount += 4;
            }
            logger_1.default.info(`Created ${features.length} plan features`);
            // 4. Create Promo Codes (10)
            logger_1.default.info('Creating PromoCode records...');
            const promoCodes = [];
            const promoCodeStrings = [
                'WELCOME10', 'SUMMER25', 'FALL20', 'WINTER30',
                'SPRING15', 'HOLIDAY50', 'FRIEND20', 'LOYAL15',
                'SAVE25', 'FLASH10'
            ];
            // Make promo codes unique with timestamp
            const uniquePromoCodes = promoCodeStrings.map(code => `${code}-${timestamp}`);
            for (let i = 0; i < 10; i++) {
                const promoCode = new PromoCode_entity_1.PromoCode();
                promoCode.code = uniquePromoCodes[i];
                promoCode.description = `${promoCodeStrings[i]} promotion`;
                promoCode.discountType = i % 2 === 0 ? PromoCode_entity_1.DiscountType.PERCENTAGE : PromoCode_entity_1.DiscountType.FIXED;
                promoCode.discountValue = promoCode.discountType === PromoCode_entity_1.DiscountType.PERCENTAGE ?
                    10 + (i * 5) : 500 + (i * 200);
                // Set dates for the promo code with proper date calculations
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 10); // Start 10 days ago
                promoCode.startDate = startDate;
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 30 + (i * 5)); // End 30-80 days from now
                promoCode.endDate = endDate;
                promoCode.usageLimit = 50 + (i * 10);
                promoCode.usageCount = i * 3;
                const savedPromoCode = yield data_source_1.AppDataSource.manager.save(promoCode);
                promoCodes.push(savedPromoCode);
            }
            logger_1.default.info(`Created ${promoCodes.length} promo codes`);
            // 5. Create Subscriptions (10)
            logger_1.default.info('Creating Subscription records...');
            const subscriptions = [];
            for (let i = 0; i < 10; i++) {
                const subscription = new Subscription_entity_1.Subscription();
                subscription.userId = fakeUserIds[i % fakeUserIds.length];
                subscription.planId = plans[i % plans.length].id;
                subscription.status = i < 6 ? Subscription_entity_1.SubscriptionStatus.ACTIVE :
                    i < 8 ? Subscription_entity_1.SubscriptionStatus.TRIAL :
                        i < 9 ? Subscription_entity_1.SubscriptionStatus.CANCELED :
                            Subscription_entity_1.SubscriptionStatus.PENDING;
                subscription.billingCycle = plans[i % plans.length].billingCycle;
                // Add required amount field
                subscription.amount = plans[i % plans.length].price;
                subscription.currency = '₹';
                // Set start date to today
                subscription.startDate = new Date();
                // Calculate end date based on billing cycle
                const endDate = new Date();
                if (subscription.billingCycle === SubscriptionPlan_entity_1.BillingCycle.MONTHLY) {
                    endDate.setMonth(endDate.getMonth() + 1);
                }
                else if (subscription.billingCycle === SubscriptionPlan_entity_1.BillingCycle.QUARTERLY) {
                    endDate.setMonth(endDate.getMonth() + 3);
                }
                else {
                    endDate.setMonth(endDate.getMonth() + 12);
                }
                subscription.endDate = endDate;
                subscription.cancelAtPeriodEnd = (i >= 8);
                subscription.cancellationReason = subscription.cancelAtPeriodEnd ? 'Too expensive' : '';
                subscription.appId = apps[i % apps.length].id;
                subscription.paymentMethod = i % 3 === 0 ? Subscription_entity_1.PaymentMethod.CREDIT_CARD :
                    i % 3 === 1 ? Subscription_entity_1.PaymentMethod.BANK_TRANSFER :
                        Subscription_entity_1.PaymentMethod.PAYPAL;
                subscription.autoRenew = !subscription.cancelAtPeriodEnd;
                const savedSubscription = yield data_source_1.AppDataSource.manager.save(subscription);
                subscriptions.push(savedSubscription);
            }
            logger_1.default.info(`Created ${subscriptions.length} subscriptions`);
            // 6. Create Subscription Promo Codes (5)
            logger_1.default.info('Creating SubscriptionPromoCode records...');
            const subscriptionPromoCodes = [];
            for (let i = 0; i < 5; i++) {
                const subscriptionPromoCode = new SubscriptionPromoCode_entity_1.SubscriptionPromoCode();
                subscriptionPromoCode.subscriptionId = subscriptions[i].id;
                subscriptionPromoCode.promoCodeId = promoCodes[i].id;
                // Add required discountAmount field
                // Calculate a realistic discount based on the promo code type
                const subscription = subscriptions[i];
                const promoCode = promoCodes[i];
                if (promoCode.discountType === PromoCode_entity_1.DiscountType.PERCENTAGE) {
                    // Apply percentage discount
                    subscriptionPromoCode.discountAmount = (subscription.amount * promoCode.discountValue) / 100;
                }
                else {
                    // Apply fixed discount (convert from cents to dollars if needed)
                    subscriptionPromoCode.discountAmount = promoCode.discountValue / 100;
                }
                // Add applied date
                subscriptionPromoCode.appliedDate = new Date();
                subscriptionPromoCode.isActive = true;
                const savedSubscriptionPromoCode = yield data_source_1.AppDataSource.manager.save(subscriptionPromoCode);
                subscriptionPromoCodes.push(savedSubscriptionPromoCode);
            }
            logger_1.default.info(`Created ${subscriptionPromoCodes.length} subscription promo codes`);
            // 7. Create Payments (10)
            logger_1.default.info('Creating Payment records...');
            const payments = [];
            for (let i = 0; i < 10; i++) {
                const payment = new Payment_entity_1.Payment();
                payment.subscriptionId = subscriptions[i].id;
                payment.userId = subscriptions[i].userId;
                payment.amount = (999 + (i * 500)) / 100;
                payment.currency = '₹';
                payment.status = i < 7 ? Payment_entity_1.PaymentStatus.SUCCEEDED :
                    i < 9 ? Payment_entity_1.PaymentStatus.PENDING :
                        Payment_entity_1.PaymentStatus.FAILED;
                payment.paymentMethod = subscriptions[i].paymentMethod;
                payment.paymentIntentId = `pi_${Date.now()}_${i}`;
                // Set billing periods
                payment.billingPeriodStart = new Date(subscriptions[i].startDate);
                payment.billingPeriodEnd = new Date(subscriptions[i].endDate);
                const savedPayment = yield data_source_1.AppDataSource.manager.save(payment);
                payments.push(savedPayment);
            }
            logger_1.default.info(`Created ${payments.length} payments`);
            logger_1.default.info('Database seeding completed successfully!');
            // Close the database connection
            yield data_source_1.AppDataSource.destroy();
            return {
                success: true,
                counts: {
                    apps: apps.length,
                    plans: plans.length,
                    features: features.length,
                    promoCodes: promoCodes.length,
                    subscriptions: subscriptions.length,
                    subscriptionPromoCodes: subscriptionPromoCodes.length,
                    payments: payments.length
                }
            };
        }
        catch (error) {
            logger_1.default.error('Error seeding database:', error);
            // Make sure to close the connection even if there's an error
            if (data_source_1.AppDataSource.isInitialized) {
                yield data_source_1.AppDataSource.destroy();
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });
}
// Run the seeder if this file is run directly
if (require.main === module) {
    seedDatabase()
        .then(result => {
        if (result.success) {
            console.log('Database seeding completed successfully!');
            console.log('Records created:', result.counts);
            process.exit(0);
        }
        else {
            console.error('Database seeding failed:', result.error);
            process.exit(1);
        }
    })
        .catch(err => {
        console.error('Uncaught error during database seeding:', err);
        process.exit(1);
    });
}
exports.default = seedDatabase;
