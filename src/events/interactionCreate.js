const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, [], client, true);
            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: 'Komutu çalıştırırken bir hata oluştu!', 
                    ephemeral: true 
                });
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'giveaway_info') {
                const infoEmbed = new EmbedBuilder()
                    .setColor('#FF1493')
                    .setTitle('ℹ️ Çekiliş Bilgilendirmesi')
                    .setDescription(`
                        **Çekiliş Kuralları ve Bilgiler**
                        
                        • Çekilişe katılmak için \`🎉 Katıl\` butonuna tıklayın
                        • Hesabınız en az 7 günlük olmalıdır
                        • Çekilişten istediğiniz zaman ayrılabilirsiniz
                        • Kazananlar rastgele seçilir
                        • Birden fazla hesapla katılmak yasaktır
                        
                        **Komutlar**
                        • \`/çekiliş\` - Yeni çekiliş başlatır
                        • \`/çbitir\` - Çekilişi erken bitirir
                        • \`/çyenile\` - Yeni kazanan seçer
                        • \`/çliste\` - Aktif çekilişleri listeler
                    `)
                    .setTimestamp()
                    .setFooter({ 
                        text: interaction.guild.name, 
                        iconURL: interaction.guild.iconURL() 
                    });

                return interaction.reply({ 
                    embeds: [infoEmbed], 
                    ephemeral: true 
                });
            }

            if (interaction.customId === 'giveaway_join') {
                const giveaway = db.get(`giveaway_${interaction.message.id}`);
                
                if (!giveaway || giveaway.ended) {
                    return interaction.reply({ 
                        content: '❌ Bu çekiliş sona ermiş!', 
                        ephemeral: true 
                    });
                }

                try {
                    const participants = db.get(`giveaway_${interaction.message.id}.participants`) || [];

                    // Minimum hesap yaşı kontrolü (7 gün)
                    const minimumAge = 7 * 24 * 60 * 60 * 1000;
                    const userAge = Date.now() - interaction.user.createdTimestamp;
                    if (userAge < minimumAge) {
                        return interaction.reply({
                            content: '❌ Hesabınız çok yeni! Çekilişe katılmak için hesabınızın en az 7 günlük olması gerekiyor.',
                            ephemeral: true
                        });
                    }

                    // Kullanıcı zaten katılmış mı kontrol et
                    if (participants.includes(interaction.user.id)) {
                        const index = participants.indexOf(interaction.user.id);
                        participants.splice(index, 1);
                        db.set(`giveaway_${interaction.message.id}.participants`, participants);

                        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                        const newDescription = embed.data.description.replace(`<@${interaction.user.id}>, `, '').replace(`<@${interaction.user.id}>`, '');
                        embed.setDescription(newDescription);
                        
                        await interaction.message.edit({ embeds: [embed] });
                        
                        return interaction.reply({ 
                            content: '🎉 Çekilişten ayrıldınız!', 
                            ephemeral: true 
                        });
                    }

                    // Kullanıcıyı çekilişe ekle
                    participants.push(interaction.user.id);
                    db.set(`giveaway_${interaction.message.id}.participants`, participants);

                    // Embed'i güncelle
                    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                    const currentParticipants = participants.map(id => `<@${id}>`).join('\n');
                    
                    embed.setDescription(`
                    🎁 **Ödül:** ${giveaway.prize}
                    ⏰ **Bitiş:** <t:${Math.floor(giveaway.endTime / 1000)}:R>
                    👑 **Çekilişi Başlatan:** <@${giveaway.hostId}>
                    🎉 **Kazanan Sayısı:** ${giveaway.winnerCount}
                    
                    **Katılanlar:** (${participants.length})
                    ${currentParticipants || 'Henüz kimse katılmadı'}
                    `);

                    await interaction.message.edit({ embeds: [embed] });

                    return interaction.reply({ 
                        content: `✅ Çekilişe başarıyla katıldınız!\n📊 Şu anki katılımcı sayısı: ${participants.length}`, 
                        ephemeral: true 
                    });

                } catch (error) {
                    console.error('Çekilişe katılırken bir hata oluştu:', error);
                    return interaction.reply({ 
                        content: '❌ Bir hata oluştu! Lütfen daha sonra tekrar deneyin.', 
                        ephemeral: true 
                    });
                }
            }
        }
    }
};