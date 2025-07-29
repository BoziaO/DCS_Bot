const { Schema, model } = require("mongoose");

const ticketMessageSchema = new Schema(
  {
    ticketId: {
      type: String,
      required: true,
      ref: 'Ticket'
    },
    messageId: {
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
    content: {
      type: String,
      required: true,
    },
    attachments: [{
      id: String,
      name: String,
      url: String,
      size: Number,
      contentType: String,
    }],
    embeds: [{
      title: String,
      description: String,
      color: String,
      fields: [{
        name: String,
        value: String,
        inline: Boolean,
      }],
    }],
    isStaff: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    deletedAt: Date,
    reactions: [{
      emoji: String,
      count: Number,
      users: [String],
    }],
  },
  { 
    timestamps: true 
  }
);

// Indeksy
ticketMessageSchema.index({ ticketId: 1, createdAt: 1 });
ticketMessageSchema.index({ userId: 1 });
ticketMessageSchema.index({ messageId: 1 });

// Metoda do tworzenia transkryptu
ticketMessageSchema.statics.getTranscript = async function(ticketId) {
  const messages = await this.find({ ticketId })
    .sort({ createdAt: 1 })
    .lean();
  
  return messages.map(msg => ({
    timestamp: msg.createdAt,
    author: msg.username,
    content: msg.content,
    attachments: msg.attachments,
    isStaff: msg.isStaff,
    isSystem: msg.isSystem,
  }));
};

module.exports = model("TicketMessage", ticketMessageSchema);