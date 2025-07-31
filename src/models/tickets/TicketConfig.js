const {Schema, model} = require("mongoose");

const ticketConfigSchema = new Schema(
    {
        guildId: {
            type: String,
            required: true,
            unique: true,
        },
        ticketsCategoryId: {
            type: String,
            required: true,
        },
        panelChannelId: {
            type: String,
            required: true,
        },
        transcriptChannelId: {
            type: String,
        },
        staffRoles: {
            admin: [String],
            moderator: [String],
            support: [String],
        },
        ticketCount: {
            type: Number,
            default: 0,
        },
        autoClose: {
            enabled: {
                type: Boolean,
                default: true,
            },
            inactiveHours: {
                type: Number,
                default: 48,
            },
            warningHours: {
                type: Number,
                default: 24,
            },
        },
        notifications: {
            newTicket: {
                type: Boolean,
                default: true,
            },
            ticketAssigned: {
                type: Boolean,
                default: true,
            },
            ticketClosed: {
                type: Boolean,
                default: true,
            },
            inactiveWarning: {
                type: Boolean,
                default: true,
            },
        },
        categories: [
            {
                id: String,
                name: String,
                description: String,
                emoji: String,
                color: String,
                assignedRoles: [String],
            },
        ],
        welcomeMessage: {
            type: String,
            default:
                "Witaj! Opisz swój problem, a członek personelu wkrótce się z Tobą skontaktuje.",
        },
        maxTicketsPerUser: {
            type: Number,
            default: 3,
        },
        requireReason: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

ticketConfigSchema.methods.isStaff = function (userId, roleIds) {
    const allStaffRoles = [
        ...this.staffRoles.admin,
        ...this.staffRoles.moderator,
        ...this.staffRoles.support,
    ];
    return roleIds.some((roleId) => allStaffRoles.includes(roleId));
};

ticketConfigSchema.methods.hasPermission = function (
    userId,
    roleIds,
    permission
) {
    switch (permission) {
        case "admin":
            return roleIds.some((roleId) => this.staffRoles.admin.includes(roleId));
        case "moderate":
            return roleIds.some(
                (roleId) =>
                    this.staffRoles.admin.includes(roleId) ||
                    this.staffRoles.moderator.includes(roleId)
            );
        case "support":
            return this.isStaff(userId, roleIds);
        default:
            return false;
    }
};

module.exports = model("TicketConfig", ticketConfigSchema);
