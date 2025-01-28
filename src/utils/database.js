const db = require('croxydb');

module.exports = {
    setGiveaway: (messageId, data) => {
        return db.set(`giveaway_${messageId}`, data);
    },

    getGiveaway: (messageId) => {
        return db.get(`giveaway_${messageId}`);
    },

    deleteGiveaway: (messageId) => {
        return db.delete(`giveaway_${messageId}`);
    },

    getAllGiveaways: () => {
        return Object.entries(db.all())
            .filter(([key]) => key.startsWith('giveaway_'))
            .map(([key, value]) => value);
    },

    getActiveGiveaways: () => {
        return Object.entries(db.all())
            .filter(([key, value]) => key.startsWith('giveaway_') && !value.ended)
            .map(([key, value]) => value);
    },

    updateGiveaway: (messageId, data) => {
        const current = db.get(`giveaway_${messageId}`);
        return db.set(`giveaway_${messageId}`, { ...current, ...data });
    },

    addParticipant: (messageId, userId) => {
        const participants = db.get(`giveaway_${messageId}.participants`) || [];
        if (!participants.includes(userId)) {
            participants.push(userId);
            db.set(`giveaway_${messageId}.participants`, participants);
        }
        return participants;
    },

    removeParticipant: (messageId, userId) => {
        const participants = db.get(`giveaway_${messageId}.participants`) || [];
        const index = participants.indexOf(userId);
        if (index > -1) {
            participants.splice(index, 1);
            db.set(`giveaway_${messageId}.participants`, participants);
        }
        return participants;
    }
};