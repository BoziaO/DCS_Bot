const WelcomeChannel = require("../../models/WelcomeChannel");
const WelcomeConfig = require("../../models/WelcomeConfig");

async function migrateWelcomeConfigs() {
    console.log("[Migration] Starting welcome system migration...");

    try {
        const oldConfigs = await WelcomeChannel.find({});

        if (oldConfigs.length === 0) {
            console.log("[Migration] No old configurations found to migrate");
            return {migrated: 0, errors: 0};
        }

        console.log(
            `[Migration] Found ${oldConfigs.length} old configurations to migrate`
        );

        let migrated = 0;
        let errors = 0;

        for (const oldConfig of oldConfigs) {
            try {
                const existingConfig = await WelcomeConfig.findOne({
                    guildId: oldConfig.guildId,
                    channelId: oldConfig.channelId,
                });

                if (existingConfig) {
                    console.log(
                        `[Migration] Configuration for ${oldConfig.guildId}:${oldConfig.channelId} already exists, skipping`
                    );
                    continue;
                }

                const newConfig = new WelcomeConfig({
                    guildId: oldConfig.guildId,
                    channelId: oldConfig.channelId,
                    enabled: true,
                    welcomeMessage: {
                        enabled: true,
                        embed: {
                            enabled: true,
                            title: oldConfig.embed.title || "Witaj na serwerze! 👋",
                            description:
                                oldConfig.embed.description ||
                                "Witaj {mention-member}! Mamy nadzieję, że będziesz się dobrze bawić na **{server-name}**.\n\nJesteś **{member-count}** członkiem naszej społeczności!",
                            color: oldConfig.embed.color || "#00ff88",
                            thumbnail: {
                                enabled: oldConfig.embed.thumbnail !== false,
                                type: "user-avatar",
                            },
                            image: {
                                enabled: !!oldConfig.embed.image,
                                url: oldConfig.embed.image || "",
                            },
                            footer: {
                                enabled: true,
                                text:
                                    oldConfig.embed.footer || "Miłego pobytu! • {server-name}",
                            },
                            timestamp: oldConfig.embed.timestamp !== false,
                        },
                        content: {
                            enabled: !!oldConfig.embed.mentionUser,
                            text: "{mention-member}",
                        },
                    },
                    farewellMessage: {
                        enabled: false,
                    },
                    autoRoles: {
                        enabled: false,
                        roles: [],
                        delay: 0,
                    },
                    directMessage: {
                        enabled: false,
                    },
                    statistics: {
                        enabled: true,
                        totalWelcomes: 0,
                        totalFarewells: 0,
                    },
                    filters: {
                        ignoreBots: true,
                        ignoreRoles: [],
                        requiredRoles: [],
                        minAccountAge: 0,
                        cooldown: 0,
                    },
                    advanced: {
                        deleteAfter: 0,
                        mentionUser: !!oldConfig.embed.mentionUser,
                        pingRoles: [],
                        customPlaceholders: [],
                    },
                });

                await newConfig.save();
                migrated++;

                console.log(
                    `[Migration] Migrated configuration for guild ${oldConfig.guildId}, channel ${oldConfig.channelId}`
                );
            } catch (error) {
                console.error(
                    `[Migration] Error migrating config ${oldConfig._id}:`,
                    error
                );
                errors++;
            }
        }

        console.log(
            `[Migration] Migration completed: ${migrated} migrated, ${errors} errors`
        );

        if (errors === 0 && migrated > 0) {
            console.log(
                "[Migration] All configurations migrated successfully. Old configurations can be safely removed."
            );
            console.log("[Migration] Run removeOldConfigs() to clean up old data.");
        }

        return {migrated, errors, total: oldConfigs.length};
    } catch (error) {
        console.error("[Migration] Fatal error during migration:", error);
        throw error;
    }
}

async function removeOldConfigs() {
    console.log("[Migration] Removing old welcome configurations...");

    try {
        const result = await WelcomeChannel.deleteMany({});
        console.log(
            `[Migration] Removed ${result.deletedCount} old configurations`
        );
        return result.deletedCount;
    } catch (error) {
        console.error("[Migration] Error removing old configurations:", error);
        throw error;
    }
}

async function checkMigrationStatus() {
    try {
        const oldCount = await WelcomeChannel.countDocuments();
        const newCount = await WelcomeConfig.countDocuments();

        return {
            oldConfigurations: oldCount,
            newConfigurations: newCount,
            migrationNeeded: oldCount > 0,
            migrationComplete: oldCount === 0 && newCount > 0,
        };
    } catch (error) {
        console.error("[Migration] Error checking migration status:", error);
        throw error;
    }
}

async function validateMigration() {
    console.log("[Migration] Validating migrated configurations...");

    try {
        const configs = await WelcomeConfig.find({});
        let valid = 0;
        let invalid = 0;
        const errors = [];

        for (const config of configs) {
            try {
                if (!config.guildId || !config.channelId) {
                    throw new Error("Missing guildId or channelId");
                }

                if (
                    !config.welcomeMessage.embed.title ||
                    !config.welcomeMessage.embed.description
                ) {
                    throw new Error("Missing embed title or description");
                }

                const colorRegex = /^#[0-9A-F]{6}$/i;
                if (
                    config.welcomeMessage.embed.color &&
                    !colorRegex.test(config.welcomeMessage.embed.color)
                ) {
                    config.welcomeMessage.embed.color = "#00ff88";
                    await config.save();
                    console.log(`[Migration] Fixed color for config ${config._id}`);
                }

                valid++;
            } catch (error) {
                invalid++;
                errors.push({
                    configId: config._id,
                    guildId: config.guildId,
                    channelId: config.channelId,
                    error: error.message,
                });
                console.error(
                    `[Migration] Invalid configuration ${config._id}:`,
                    error.message
                );
            }
        }

        console.log(
            `[Migration] Validation complete: ${valid} valid, ${invalid} invalid`
        );

        return {
            total: configs.length,
            valid,
            invalid,
            errors,
        };
    } catch (error) {
        console.error("[Migration] Error during validation:", error);
        throw error;
    }
}

async function backupOldConfigs() {
    console.log("[Migration] Creating backup of old configurations...");

    try {
        const oldConfigs = await WelcomeChannel.find({}).lean();

        if (oldConfigs.length === 0) {
            console.log("[Migration] No old configurations to backup");
            return null;
        }

        const backup = {
            timestamp: new Date().toISOString(),
            count: oldConfigs.length,
            configurations: oldConfigs,
        };

        const fs = require("fs");
        const path = require("path");
        const backupPath = path.join(__dirname, "../../backups");

        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, {recursive: true});
        }

        const filename = `welcome_backup_${Date.now()}.json`;
        const filepath = path.join(backupPath, filename);

        fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

        console.log(`[Migration] Backup created: ${filepath}`);
        return filepath;
    } catch (error) {
        console.error("[Migration] Error creating backup:", error);
        throw error;
    }
}

async function restoreFromBackup(backupPath) {
    console.log(`[Migration] Restoring from backup: ${backupPath}`);

    try {
        const fs = require("fs");

        if (!fs.existsSync(backupPath)) {
            throw new Error("Backup file not found");
        }

        const backupData = JSON.parse(fs.readFileSync(backupPath, "utf8"));

        if (
            !backupData.configurations ||
            !Array.isArray(backupData.configurations)
        ) {
            throw new Error("Invalid backup format");
        }

        let restored = 0;
        let errors = 0;

        for (const configData of backupData.configurations) {
            try {
                delete configData._id;
                delete configData.__v;

                const config = new WelcomeChannel(configData);
                await config.save();
                restored++;
            } catch (error) {
                console.error(`[Migration] Error restoring config:`, error);
                errors++;
            }
        }

        console.log(
            `[Migration] Restore complete: ${restored} restored, ${errors} errors`
        );
        return {restored, errors, total: backupData.configurations.length};
    } catch (error) {
        console.error("[Migration] Error during restore:", error);
        throw error;
    }
}

module.exports = {
    migrateWelcomeConfigs,
    removeOldConfigs,
    checkMigrationStatus,
    validateMigration,
    backupOldConfigs,
    restoreFromBackup,
};
