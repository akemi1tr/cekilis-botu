const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('croxydb');

module.exports = {
    name: 'çbitir',
    data: new SlashCommandBuilder()
        .setName('çbitir')
        .setDescription('Devam eden bir çekilişi bitirir')
        .addStringOption(option =>
            option.setName('mesaj-id')
                .setDescription('Çekiliş mesajının ID\'si')
                .setRequired(true)),

    async execute(message, args, client, isSlash = false) {
        const interaction = isSlash ? message : null;
        const member = isSlash ? interaction.member : message.member;
        const channel = isSlash ? interaction.channel : message.channel;

        if (!member.permissions.has('ManageMessages')) {
            return isSlash
                ? interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yok!', ephemeral: true })
                : message.reply('❌ Bu komutu kullanmak için yetkiniz yok!');
        }

        const messageId = isSlash ? interaction.options.getString('mesaj-id') : args[0];

        if (!messageId) {
            return isSlash
                ? interaction.reply({ content: '❌ Bir çekiliş ID\'si belirtmelisiniz!', ephemeral: true })
                : message.reply('❌ Bir çekiliş ID\'si belirtmelisiniz!');
        }

        const giveaway = db.get(`giveaway_${messageId}`);
        if (!giveaway) {
            return isSlash
                ? interaction.reply({ content: '❌ Belirtilen ID\'ye sahip bir çekiliş bulunamadı!', ephemeral: true })
                : message.reply('❌ Belirtilen ID\'ye sahip bir çekiliş bulunamadı!');
        }

        if (giveaway.ended) {
            return isSlash
                ? interaction.reply({ content: '❌ Bu çekiliş zaten sona ermiş!', ephemeral: true })
                : message.reply('❌ Bu çekiliş zaten sona ermiş!');
        }

        try {
            const giveawayChannel = await client.channels.fetch(giveaway.channelId);
            if (!giveawayChannel) throw new Error('Kanal bulunamadı');

            const giveawayMessage = await giveawayChannel.messages.fetch(messageId);
            if (!giveawayMessage) throw new Error('Mesaj bulunamadı');

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
                        text: `${channel.guild.name} • Çekiliş Erken Bitirildi`, 
                        iconURL: channel.guild.iconURL() 
                    });

                await giveawayMessage.edit({ embeds: [endEmbed], components: [] });
                db.set(`giveaway_${messageId}.ended`, true);

                return isSlash
                    ? interaction.reply('✅ Çekiliş bitirildi fakat katılımcı olmadığı için kazanan seçilemedi.')
                    : message.reply('✅ Çekiliş bitirildi fakat katılımcı olmadığı için kazanan seçilemedi.');
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
                .setImage('https://i.imgur.com/4MfQxJp.gif')
                .setTimestamp()
                .setFooter({ 
                    text: `${channel.guild.name} • Çekiliş Erken Bitirildi`, 
                    iconURL: channel.guild.iconURL() 
                });

            await giveawayMessage.edit({ embeds: [endEmbed], components: [] });
            
            const winnersMessage = await giveawayChannel.send({
                content: `🎊 Tebrikler ${winners.map(w => `<@${w}>`).join(', ')}! **${giveaway.prize}** kazandınız!\n||${winners.map(w => `<@${w}>`).join(', ')}||`,
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF1493')
                        .setDescription('🎁 Lütfen ödülünüzü almak için çekilişi başlatan kişiye DM üzerinden ulaşın.')
                ]
            });

            db.set(`giveaway_${messageId}.ended`, true);
            db.set(`giveaway_${messageId}.winners`, winners);

            return isSlash
                ? interaction.reply('✅ Çekiliş başarıyla bitirildi!')
                : message.reply('✅ Çekiliş başarıyla bitirildi!');

        } catch (error) {
            console.error(error);
            return isSlash
                ? interaction.reply({ content: '❌ Çekiliş bitirilirken bir hata oluştu!', ephemeral: true })
                : message.reply('❌ Çekiliş bitirilirken bir hata oluştu!');
        }
    }
};