const { Schema, model } = require("mongoose");

const ticketStatsSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    period: {
      type: String,
      required: true,
      enum: ["daily", "weekly", "monthly"],
    },
    stats: {
      ticketsCreated: {
        type: Number,
        default: 0,
      },
      ticketsClosed: {
        type: Number,
        default: 0,
      },
      ticketsResolved: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
      averageResolutionTime: {
        type: Number,
        default: 0,
      },
      staffActivity: [
        {
          userId: String,
          username: String,
          ticketsHandled: Number,
          messagesCount: Number,
          averageRating: Number,
        },
      ],
      categoryBreakdown: [
        {
          category: String,
          count: Number,
          averageResolutionTime: Number,
        },
      ],
      priorityBreakdown: [
        {
          priority: String,
          count: Number,
          averageResolutionTime: Number,
        },
      ],
      satisfactionScore: {
        type: Number,
        default: 0,
      },
      totalMessages: {
        type: Number,
        default: 0,
      },
      uniqueUsers: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

ticketStatsSchema.index({ guildId: 1, date: 1, period: 1 }, { unique: true });
ticketStatsSchema.index({ guildId: 1, period: 1 });

ticketStatsSchema.statics.generateDailyStats = async function (
  guildId,
  date = new Date()
) {
  const Ticket = require("./Ticket");
  const TicketMessage = require("./TicketMessage");
  const TicketRating = require("./TicketRating");

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const tickets = await Ticket.find({
    guildId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const closedTickets = await Ticket.find({
    guildId,
    "closedBy.closedAt": { $gte: startOfDay, $lte: endOfDay },
  });

  const messages = await TicketMessage.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  }).populate("ticketId");

  const ratings = await TicketRating.find({
    guildId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const stats = {
    ticketsCreated: tickets.length,
    ticketsClosed: closedTickets.length,
    ticketsResolved: closedTickets.filter((t) => t.status === "resolved")
      .length,
    averageResponseTime: 0,
    averageResolutionTime: 0,
    staffActivity: [],
    categoryBreakdown: [],
    priorityBreakdown: [],
    satisfactionScore:
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0,
    totalMessages: messages.length,
    uniqueUsers: [...new Set(tickets.map((t) => t.userId))].length,
  };

  return await this.findOneAndUpdate(
    { guildId, date: startOfDay, period: "daily" },
    { stats },
    { upsert: true, new: true }
  );
};

ticketStatsSchema.statics.getStatsForPeriod = async function (
  guildId,
  period,
  startDate,
  endDate
) {
  return await this.find({
    guildId,
    period,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });
};

ticketStatsSchema.statics.getTopPerformers = async function (
  guildId,
  period = "monthly",
  limit = 5
) {
  const stats = await this.find({ guildId, period })
    .sort({ date: -1 })
    .limit(1);

  if (stats.length === 0) return [];

  const staffActivity = stats[0].stats.staffActivity || [];
  return staffActivity
    .sort((a, b) => b.ticketsHandled - a.ticketsHandled)
    .slice(0, limit);
};

module.exports = model("TicketStats", ticketStatsSchema);
