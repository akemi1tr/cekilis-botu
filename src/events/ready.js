const { ActivityType, EmbedBuilder } = require('discord.js');
const db = require('croxydb');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`${client.user.tag} olarak giriş yapıldı!`);

        client.user.setPresence({
            activities: [{ 
                name: '🎉 Çekiliş Botu', 
                type: ActivityType.Playing 
            }],
            status: 'online'
        });

        setInterval(async () => {
            const giveaways = Object.entries(db.all())
                .filter(([key, value]) => key.startsWith('giveaway_') && !value.ended && value.endTime <= Date.now());

            for (const [key, giveaway] of giveaways) {
                try {
                    const guild = client.guilds.cache.get(giveaway.guildId);
                    if (!guild) continue;

                    const channel = guild.channels.cache.get(giveaway.channelId);
                    if (!channel) continue;

                    const message = await channel.messages.fetch(giveaway.messageId);
                    if (!message) continue;

                    const participants = giveaway.participants || [];

                    if (participants.length === 0) {
                        const endEmbed = new EmbedBuilder()
                            .setColor('#FF1493')
                            .setTitle('🎉 ÇEKİLİŞ BİTTİ 🎉')
                            .setDescription(`
                                **🎁 Ödül:** ${giveaway.prize}
                                
                                😔 Maalesef çekilişe kimse katılmadı.
                            `)
                            .setTimestamp()
                            .setFooter({ 
                                text: `${guild.name} • Çekiliş Sona Erdi`, 
                                iconURL: guild.iconURL() 
                            });

                        await message.edit({ embeds: [endEmbed], components: [] });
                        db.set(`${key}.ended`, true);
                        continue;
                    }

                    const winners = [];
                    const participantsList = [...participants];

                    for (let i = 0; i < Math.min(giveaway.winnerCount, participants.length); i++) {
                        const winnerIndex = Math.floor(Math.random() * participantsList.length);
                        winners.push(participantsList[winnerIndex]);
                        participantsList.splice(winnerIndex, 1);
                    }

                    const endEmbed = new EmbedBuilder()
                        .setColor('#FF1493')
                        .setTitle('🎉 ÇEKİLİŞ BİTTİ 🎉')
                        .setDescription(`
                            **🎁 Ödül:** ${giveaway.prize}
                            👑 **Çekilişi Başlatan:** <@${giveaway.hostId}>
                            
                            🏆 **Kazanan(lar):**
                            ${winners.map(winner => `<@${winner}>`).join('\n')}
                            
                            **Toplam Katılımcı:** ${participants.length}
                        `)
                        .setImage('https://i.pinimg.com/originals/82/f4/23/82f423fda5e28eec4178f58671f58f11.gif')
                        .setTimestamp()
                        .setFooter({ 
                            text: `${guild.name} • Çekiliş Sona Erdi`, 
                            iconURL: guild.iconURL() 
                        });

                    await message.edit({ embeds: [endEmbed], components: [] });

                    const winnersMessage = await channel.send({
                        content: `🎊 Tebrikler ${winners.map(w => `<@${w}>`).join(', ')}! **${giveaway.prize}** kazandınız!\n||${winners.map(w => `<@${w}>`).join(', ')}||`,
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF1493')
                                .setDescription('🎁 Lütfen ödülünüzü almak için çekilişi başlatan kişiye DM üzerinden ulaşın.')
                        ]
                    });

                    db.set(`${key}.ended`, true);
                    db.set(`${key}.winners`, winners);

                } catch (error) {
                    console.error('Çekiliş bitirme hatası:', error);
                }
            }
        }, 10000); 
    }
};