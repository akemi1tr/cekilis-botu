const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const ms = require('ms');

module.exports = {
    name: 'çliste',
    data: new SlashCommandBuilder()
        .setName('çliste')
        .setDescription('Aktif çekilişleri listeler'),

    async execute(message, args, client, isSlash = false) {
        const interaction = isSlash ? message : null;
        const channel = isSlash ? interaction.channel : message.channel;
        const guild = isSlash ? interaction.guild : message.guild;

        const giveaways = Object.entries(db.all())
            .filter(([key, value]) => 
                key.startsWith('giveaway_') && 
                value.guildId === guild.id && 
                !value.ended
            );

        if (giveaways.length === 0) {
            const noGiveawayEmbed = new EmbedBuilder()
                .setColor('#FF1493')
                .setTitle('📊 Çekiliş Durumu')
                .setDescription('😔 Şu anda aktif çekiliş bulunmuyor.')
                .setTimestamp()
                .setFooter({ 
                    text: guild.name, 
                    iconURL: guild.iconURL() 
                });

            return isSlash
                ? interaction.reply({ embeds: [noGiveawayEmbed] })
                : channel.send({ embeds: [noGiveawayEmbed] });
        }

        const mainEmbed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎉 Aktif Çekilişler')
            .setDescription(`Sunucuda toplam **${giveaways.length}** aktif çekiliş bulunuyor.`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setTimestamp();

        const giveawayList = await Promise.all(giveaways.map(async ([key, giveaway], index) => {
            const timeLeft = giveaway.endTime - Date.now();
            const giveawayChannel = await client.channels.fetch(giveaway.channelId);
            const participants = giveaway.participants || [];

            return new EmbedBuilder()
                .setColor('#FF1493')
                .setTitle(`#${index + 1} - ${giveaway.prize}`)
                .setDescription(`
                    🎁 **Ödül:** ${giveaway.prize}
                    ⏰ **Bitiş:** <t:${Math.floor(giveaway.endTime / 1000)}:R>
                    👥 **Katılımcı:** ${participants.length} kişi
                    🎉 **Kazanan Sayısı:** ${giveaway.winnerCount}
                    📢 **Kanal:** ${giveawayChannel ? `<#${giveawayChannel.id}>` : 'Bilinmiyor'}
                    👑 **Başlatan:** <@${giveaway.hostId}>
                    🔗 **Çekiliş ID:** \`${giveaway.messageId}\`
                `)
                .setFooter({ 
                    text: `${guild.name} • Sayfa ${index + 1}/${giveaways.length}`,
                    iconURL: guild.iconURL()
                });
        }));

        const statsEmbed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('📊 Çekiliş İstatistikleri')
            .addFields(
                { 
                    name: '🎉 Aktif Çekilişler', 
                    value: `${giveaways.length}`, 
                    inline: true 
                },
                { 
                    name: '🎁 Toplam Ödül', 
                    value: `${giveaways.reduce((acc, [_, g]) => acc + g.winnerCount, 0)}`, 
                    inline: true 
                },
                {
                    name: '👥 Toplam Katılımcı',
                    value: `${giveaways.reduce((acc, [_, g]) => acc + (g.participants?.length || 0), 0)}`,
                    inline: true
                }
            )
            .addFields(
                {
                    name: '🏆 En Büyük Ödül',
                    value: giveaways.sort((a, b) => b[1].prize.length - a[1].prize.length)[0][1].prize,
                    inline: true
                },
                {
                    name: '⏰ En Yakın Bitiş',
                    value: `<t:${Math.floor(Math.min(...giveaways.map(([_, g]) => g.endTime)) / 1000)}:R>`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: guild.name, 
                iconURL: guild.iconURL() 
            });

        const allEmbeds = [mainEmbed, ...giveawayList, statsEmbed];

        if (isSlash) {
            await interaction.reply({ embeds: allEmbeds });
        } else {
            await channel.send({ embeds: allEmbeds });
        }
    }
};