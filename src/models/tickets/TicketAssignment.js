const {Schema, model} = require("mongoose");

const ticketAssignmentSchema = new Schema(
    {
        ticketId: {
            type: String,
            required: true,
            ref: "Ticket",
        },
        assignedTo: {
            type: String,
            required: true,
        },
        assignedBy: {
            type: String,
            required: true,
        },
        assignedAt: {
            type: Date,
            default: Date.now,
        },
        unassignedAt: Date,
        unassignedBy: String,
        reason: String,
        isActive: {
            type: Boolean,
            default: true,
        },
        workload: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

ticketAssignmentSchema.index({ticketId: 1});
ticketAssignmentSchema.index({assignedTo: 1, isActive: 1});
ticketAssignmentSchema.index({assignedAt: 1});

ticketAssignmentSchema.statics.getActiveAssignments = function (userId) {
    return this.find({assignedTo: userId, isActive: true});
};

ticketAssignmentSchema.statics.getUserWorkload = async function (userId) {
    const assignments = await this.find({assignedTo: userId, isActive: true});
    return assignments.reduce(
        (total, assignment) => total + assignment.workload,
        0
    );
};

ticketAssignmentSchema.statics.getAvailableStaff = async function (
    staffIds,
    maxWorkload = 5
) {
    const workloads = await Promise.all(
        staffIds.map(async (staffId) => ({
            userId: staffId,
            workload: await this.getUserWorkload(staffId),
        }))
    );

    return workloads
        .filter((staff) => staff.workload < maxWorkload)
        .sort((a, b) => a.workload - b.workload);
};

ticketAssignmentSchema.methods.unassign = function (unassignedBy, reason) {
    this.isActive = false;
    this.unassignedAt = new Date();
    this.unassignedBy = unassignedBy;
    this.reason = reason;
    return this.save();
};

module.exports = model("TicketAssignment", ticketAssignmentSchema);
