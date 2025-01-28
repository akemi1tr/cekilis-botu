const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('croxydb');

module.exports = {
    name: 'çyenile',
    data: new SlashCommandBuilder()
        .setName('çyenile')
        .setDescription('Bitmiş bir çekilişin kazananlarını yeniden belirler')
        .addStringOption(option =>
            option.setName('mesaj-id')
                .setDescription('Çekiliş mesajının ID\'si')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('kazanan-sayısı')
                .setDescription('Yeni kazanan sayısı')
                .setRequired(false)),

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
        const newWinnerCount = isSlash 
            ? interaction.options.getInteger('kazanan-sayısı') 
            : args[1] ? parseInt(args[1]) : null;

        const giveaway = db.get(`giveaway_${messageId}`);
        if (!giveaway) {
            return isSlash
                ? interaction.reply({ content: '❌ Belirtilen ID\'ye sahip bir çekiliş bulunamadı!', ephemeral: true })
                : message.reply('❌ Belirtilen ID\'ye sahip bir çekiliş bulunamadı!');
        }

        if (!giveaway.ended) {
            return isSlash
                ? interaction.reply({ content: '❌ Bu çekiliş henüz bitmemiş!', ephemeral: true })
                : message.reply('❌ Bu çekiliş henüz bitmemiş!');
        }

        try {
            const giveawayChannel = await client.channels.fetch(giveaway.channelId);
            if (!giveawayChannel) throw new Error('Kanal bulunamadı');

            const giveawayMessage = await giveawayChannel.messages.fetch(messageId);
            if (!giveawayMessage) throw new Error('Mesaj bulunamadı');

            const participants = giveaway.participants || [];
            
            if (participants.length === 0) {
                return isSlash
                    ? interaction.reply({ content: '❌ Çekilişe katılan olmadığı için yeni kazanan seçilemiyor!', ephemeral: true })
                    : message.reply('❌ Çekilişe katılan olmadığı için yeni kazanan seçilemiyor!');
            }

            const winnerCount = newWinnerCount || giveaway.winnerCount;
            const winners = [];
            const participantsList = [...participants];

            for (let i = 0; i < Math.min(winnerCount, participants.length); i++) {
                const winnerIndex = Math.floor(Math.random() * participantsList.length);
                winners.push(participantsList[winnerIndex]);
                participantsList.splice(winnerIndex, 1);
            }

            const rerollEmbed = new EmbedBuilder()
                .setColor('#FF1493')
                .setTitle('🎉 ÇEKİLİŞ YENİLENDİ 🎉')
                .setDescription(`
                    **🎁 Ödül:** ${giveaway.prize}
                    👑 **Çekilişi Başlatan:** <@${giveaway.hostId}>
                    
                    🏆 **Yeni Kazanan(lar):**
                    ${winners.map(winner => `<@${winner}>`).join('\n')}
                    
                    **Toplam Katılımcı:** ${participants.length}
                `)
                .setImage('https://i.imgur.com/4MfQxJp.gif')
                .setTimestamp()
                .setFooter({ 
                    text: `${channel.guild.name} • Çekiliş Yenilendi`, 
                    iconURL: channel.guild.iconURL() 
                });

            await giveawayMessage.edit({ embeds: [rerollEmbed] });

            const winnersMessage = await giveawayChannel.send({
                content: `🎊 Tebrikler ${winners.map(w => `<@${w}>`).join(', ')}! **${giveaway.prize}** kazandınız!\n||${winners.map(w => `<@${w}>`).join(', ')}||`,
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF1493')
                        .setDescription('🎁 Lütfen ödülünüzü almak için çekilişi başlatan kişiye DM üzerinden ulaşın.')
                ]
            });

            db.set(`giveaway_${messageId}.winners`, winners);

            return isSlash
                ? interaction.reply('✅ Yeni kazananlar başarıyla belirlendi!')
                : message.reply('✅ Yeni kazananlar başarıyla belirlendi!');

        } catch (error) {
            console.error(error);
            return isSlash
                ? interaction.reply({ content: '❌ Yeni kazananlar belirlenirken bir hata oluştu!', ephemeral: true })
                : message.reply('❌ Yeni kazananlar belirlenirken bir hata oluştu!');
        }
    }
};