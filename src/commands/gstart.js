const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');
const ms = require('ms');

module.exports = {
    name: 'çekiliş',
    data: new SlashCommandBuilder()
        .setName('çekiliş')
        .setDescription('Yeni bir çekiliş başlatır')
        .addStringOption(option =>
            option.setName('süre')
                .setDescription('Çekiliş süresi (1h, 1d gibi)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('kazanan')
                .setDescription('Kazanan sayısı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ödül')
                .setDescription('Çekiliş ödülü')
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

        let duration, winners, prize;

        if (isSlash) {
            duration = interaction.options.getString('süre');
            winners = interaction.options.getInteger('kazanan');
            prize = interaction.options.getString('ödül');
        } else {
            duration = args[0];
            winners = parseInt(args[1]);
            prize = args.slice(2).join(' ');
        }

        if (!duration || !winners || !prize) {
            return isSlash
                ? interaction.reply({ content: '❌ Doğru kullanım: /çekiliş <süre> <kazanan> <ödül>', ephemeral: true })
                : message.reply('❌ Doğru kullanım: !çekiliş <süre> <kazanan> <ödül>');
        }

        const time = ms(duration);
        if (!time) {
            return isSlash
                ? interaction.reply({ content: '❌ Geçerli bir süre belirtin! (1s, 1m, 1h, 1d)', ephemeral: true })
                : message.reply('❌ Geçerli bir süre belirtin! (1s, 1m, 1h, 1d)');
        }

        const endTime = Date.now() + time;

        const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎉 YENİ ÇEKİLİŞ 🎉')
            .setDescription(`
            🎁 **Ödül:** ${prize}
            ⏰ **Bitiş:** <t:${Math.floor(endTime / 1000)}:R>
            👑 **Çekilişi Başlatan:** ${isSlash ? interaction.user : message.author}
            🎉 **Kazanan Sayısı:** ${winners}
            
            **Katılanlar:** (0)
            Henüz kimse katılmadı
            `)
            .setImage('https://i.pinimg.com/originals/36/4e/a6/364ea6cd7bfd00a0260aaf6e2602cd4d.gif')
            .setTimestamp(endTime)
            .setFooter({ 
                text: `${channel.guild.name} • Çekiliş Sistemi`, 
                iconURL: channel.guild.iconURL() 
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel('🎉 Katıl')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('giveaway_info')
                    .setLabel('ℹ️ Bilgi')
                    .setStyle(ButtonStyle.Primary)
            );

        if (isSlash) await interaction.reply({ content: '✅ Çekiliş başlatılıyor...', ephemeral: true });

        const giveawayMessage = await channel.send({ 
            embeds: [embed], 
            components: [row] 
        });

        db.set(`giveaway_${giveawayMessage.id}`, {
            prize: prize,
            winnerCount: winners,
            endTime: endTime,
            channelId: channel.id,
            guildId: channel.guild.id,
            hostId: isSlash ? interaction.user.id : message.author.id,
            messageId: giveawayMessage.id,
            ended: false,
            participants: []
        });

        if (!isSlash) message.delete().catch(() => {});
    }
};