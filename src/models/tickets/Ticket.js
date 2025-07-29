const { Schema, model } = require("mongoose");

const ticketSchema = new Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    guildId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["support", "report", "question", "other"],
      default: "support",
    },
    priority: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      required: true,
      enum: ["open", "assigned", "pending", "resolved", "closed"],
      default: "open",
    },
    assignedTo: {
      userId: String,
      username: String,
      assignedAt: Date,
      assignedBy: String,
    },
    closedBy: {
      userId: String,
      username: String,
      closedAt: Date,
      reason: String,
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
      ratedAt: Date,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    tags: [String],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indeksy dla lepszej wydajności
ticketSchema.index({ guildId: 1, status: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ userId: 1 });
ticketSchema.index({ lastActivity: 1 });

// Virtual dla czasu trwania ticketu
ticketSchema.virtual('duration').get(function() {
  if (this.closedBy && this.closedBy.closedAt) {
    return this.closedBy.closedAt - this.createdAt;
  }
  return Date.now() - this.createdAt;
});

// Metoda do sprawdzania czy ticket jest nieaktywny
ticketSchema.methods.isInactive = function(hours = 24) {
  const inactiveTime = hours * 60 * 60 * 1000; // hours to milliseconds
  return (Date.now() - this.lastActivity) > inactiveTime;
};

// Metoda do aktualizacji ostatniej aktywności
ticketSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = model("Ticket", ticketSchema);