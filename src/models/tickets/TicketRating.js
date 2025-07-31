const {Schema, model} = require("mongoose");

const ticketRatingSchema = new Schema(
    {
        ticketId: {
            type: String,
            required: true,
            ref: 'Ticket',
            unique: true,
        },
        guildId: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        staffId: {
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        feedback: {
            type: String,
            maxlength: 1000,
        },
        categories: {
            responseTime: {
                type: Number,
                min: 1,
                max: 5,
            },
            helpfulness: {
                type: Number,
                min: 1,
                max: 5,
            },
            professionalism: {
                type: Number,
                min: 1,
                max: 5,
            },
            resolution: {
                type: Number,
                min: 1,
                max: 5,
            },
        },
        wouldRecommend: {
            type: Boolean,
        },
        anonymous: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true
    }
);


ticketRatingSchema.index({guildId: 1, staffId: 1});
ticketRatingSchema.index({rating: 1});
ticketRatingSchema.index({createdAt: 1});


ticketRatingSchema.statics.getStaffStats = async function (staffId, guildId) {
    const ratings = await this.find({staffId, guildId});

    if (ratings.length === 0) {
        return {
            totalRatings: 0,
            averageRating: 0,
            categoryAverages: {},
            recommendationRate: 0,
        };
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    const categoryAverages = {
        responseTime: 0,
        helpfulness: 0,
        professionalism: 0,
        resolution: 0,
    };

    let categoryCount = 0;
    ratings.forEach(rating => {
        if (rating.categories) {
            Object.keys(categoryAverages).forEach(category => {
                if (rating.categories[category]) {
                    categoryAverages[category] += rating.categories[category];
                    categoryCount++;
                }
            });
        }
    });

    if (categoryCount > 0) {
        Object.keys(categoryAverages).forEach(category => {
            categoryAverages[category] = categoryAverages[category] / (categoryCount / 4);
        });
    }

    const recommendationRate = ratings.filter(r => r.wouldRecommend).length / ratings.length;

    return {
        totalRatings: ratings.length,
        averageRating: Math.round(averageRating * 100) / 100,
        categoryAverages,
        recommendationRate: Math.round(recommendationRate * 100),
        recentFeedback: ratings
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
            .map(r => ({
                rating: r.rating,
                feedback: r.feedback,
                date: r.createdAt,
                anonymous: r.anonymous,
            })),
    };
};

ticketRatingSchema.statics.getGuildStats = async function (guildId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const ratings = await this.find({
        guildId,
        createdAt: {$gte: startDate}
    });

    if (ratings.length === 0) {
        return {
            totalRatings: 0,
            averageRating: 0,
            ratingDistribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            recommendationRate: 0,
        };
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    const ratingDistribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
    ratings.forEach(rating => {
        ratingDistribution[rating.rating]++;
    });

    const recommendationRate = ratings.filter(r => r.wouldRecommend).length / ratings.length;

    return {
        totalRatings: ratings.length,
        averageRating: Math.round(averageRating * 100) / 100,
        ratingDistribution,
        recommendationRate: Math.round(recommendationRate * 100),
    };
};

module.exports = model("TicketRating", ticketRatingSchema);