const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const emojis = require('../emojis.js');
const config = require('../config.js');

function formatDuration(ms) {
    // Return 'LIVE' for streams
    if (!ms || ms <= 0 || ms === 'Infinity') return 'LIVE';

    // Convert to seconds
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    // Format based on length
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getDurationString(track) {
    if (track.info.isStream) return 'LIVE';
    if (!track.info.duration) return 'N/A';
    return formatDuration(track.info.duration);
}

module.exports = {
    success: (channel, message) => {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription(`${emojis.success} ${message}`);
        return channel.send({ embeds: [embed] });
    },

    error: (channel, message) => {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setDescription(`${emojis.error} ${message}`);
        return channel.send({ embeds: [embed] });
    },

    nowPlaying: (channel, track) => {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`${emojis.music} Now Playing`)
            .setDescription(`[${track.info.title}](${track.info.uri})`)
            .setAuthor({ name: 'Music Player', iconURL: channel.client.user.displayAvatarURL() });

        if (track.info.thumbnail && typeof track.info.thumbnail === 'string') {
            embed.setThumbnail(track.info.thumbnail);
        }

        embed.addFields([
            { name: 'Artist', value: `${emojis.info} ${track.info.author}`, inline: true },
            { name: 'Duration', value: `${emojis.time} ${getDurationString(track)}`, inline: true },
            { name: 'Requested By', value: `${emojis.info} ${track.info.requester.tag}`, inline: true }
        ])
        .setFooter({ text: 'Use !help to see all commands' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emojis.previous),
                new ButtonBuilder()
                    .setCustomId('pause')
                    .setLabel('Pause')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(emojis.pause),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setLabel('Skip')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emojis.skip),
                new ButtonBuilder()
                    .setCustomId('loop')
                    .setLabel('Loop')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emojis.repeat),
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setLabel('Stop')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emojis.stop)
            );

        return channel.send({ embeds: [embed], components: [row] });
    },

    addedToQueue: (channel, track, position) => {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription(`${emojis.success} Added to queue: [${track.info.title}](${track.info.uri})`)
            .setAuthor({ name: 'Queue Update', iconURL: channel.client.user.displayAvatarURL() });

        if (track.info.thumbnail && typeof track.info.thumbnail === 'string') {
            embed.setThumbnail(track.info.thumbnail);
        }

        embed.addFields([
            { name: 'Artist', value: `${emojis.info} ${track.info.author}`, inline: true },
            { name: 'Duration', value: `${emojis.time} ${getDurationString(track)}`, inline: true },
            { name: 'Position', value: `${emojis.queue} #${position}`, inline: true }
        ]);

        return channel.send({ embeds: [embed] });
    },

    addedPlaylist: (channel, playlistInfo, tracks) => {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`${emojis.success} Added Playlist`)
            .setDescription(`**${playlistInfo.name}**`);

        if (playlistInfo.thumbnail && typeof playlistInfo.thumbnail === 'string') {
            embed.setThumbnail(playlistInfo.thumbnail);
        }

        // Calculate total duration excluding streams
        const totalDuration = tracks.reduce((acc, track) => {
            if (!track.info.isStream && track.info.duration) {
                return acc + track.info.duration;
            }
            return acc;
        }, 0);

        embed.addFields([
            { name: 'Total Tracks', value: `${emojis.queue} ${tracks.length} tracks`, inline: true },
            { name: 'Total Duration', value: `${emojis.time} ${formatDuration(totalDuration)}`, inline: true },
            { name: 'Stream Count', value: `${emojis.info} ${tracks.filter(t => t.info.isStream).length} streams`, inline: true }
        ])
        .setFooter({ text: 'The playlist will start playing soon' });

        return channel.send({ embeds: [embed] });
    },

    queueEnded: (channel) => {
        return channel.send(`${emojis.info} | Queue has ended. Leaving voice channel.`);
    },

    queueList: (channel, queue, currentTrack, currentPage = 1, totalPages = 1) => {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`${emojis.queue} Queue List`)
            .setAuthor({ name: 'Queue Management', iconURL: channel.client.user.displayAvatarURL() });

        if (currentTrack) {
            embed.setDescription(
                `**Now Playing:**\n${emojis.play} [${currentTrack.info.title}](${currentTrack.info.uri}) - ${getDurationString(currentTrack)}\n\n**Up Next:**`
            );

            if (currentTrack.info.thumbnail && typeof currentTrack.info.thumbnail === 'string') {
                embed.setThumbnail(currentTrack.info.thumbnail);
            }
        } else {
            embed.setDescription("**Queue:**");
        }

        const MAX_TRACKS_DISPLAY = 15;
        if (queue.length) {
            // Only include tracks with all required info
            const validTracks = queue
                .filter(track => track && track.info && track.info.title && track.info.uri && track.info.duration)
                .slice(0, MAX_TRACKS_DISPLAY);

            const tracksString = validTracks.map((track, i) =>
                `\`${(i + 1).toString().padStart(2, '0')}\` ${emojis.song} [${track.info.title}](${track.info.uri}) - ${getDurationString(track)}`
            ).join('\n');

            embed.addFields({ name: '\u200b', value: tracksString || 'Sırada şarkı yok!' });

            if (queue.length > MAX_TRACKS_DISPLAY) {
                embed.addFields({ name: '\u200b', value: `...ve ${queue.length - MAX_TRACKS_DISPLAY} daha fazla şarkı!` });
            }

            const totalDuration = queue.reduce((acc, track) => {
                if (track && track.info && !track.info.isStream && track.info.duration) {
                    return acc + track.info.duration;
                }
                return acc;
            }, 0);

            const streamCount = queue.filter(t => t && t.info && t.info.isStream).length;
            const durationText = streamCount > 0 
                ? `Total Duration: ${formatDuration(totalDuration)} (${streamCount} streams)`
                : `Total Duration: ${formatDuration(totalDuration)}`;

            embed.setFooter({ 
                text: `Total Tracks: ${queue.length} • ${durationText} • Page ${currentPage}/${totalPages}` 
            });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('First')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('Last')
                        .setStyle(ButtonStyle.Secondary)
                );

            return channel.send({ embeds: [embed], components: [row] });
        }

        // Queue boşsa
        embed.addFields({ name: '\u200b', value: 'Sırada şarkı yok!' });
        embed.setFooter({ text: `Page ${currentPage}/${totalPages}` });
        return channel.send({ embeds: [embed] });
    },

    playerStatus: (channel, player) => {
        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`${emojis.info} Player Status`)
            .addFields([
                { 
                    name: 'Status', 
                    value: player.playing ? `${emojis.play} Playing` : `${emojis.pause} Paused`, 
                    inline: true 
                },
                { 
                    name: 'Volume', 
                    value: `${emojis.volume} ${player.volume}%`, 
                    inline: true 
                },
                { 
                    name: 'Loop Mode', 
                    value: `${emojis.repeat} ${player.loop === "queue" ? 'Queue' : 'Disabled'}`, 
                    inline: true 
                }
            ]);

        if (player.queue.current) {
            const track = player.queue.current;
            embed.setDescription(
                `**Şuanda Çalmaktaki Şarkı:**\n${emojis.music} [${track.info.title}](${track.info.uri})\n` +
                `${emojis.time} Süre: ${getDurationString(track)}`
            );
            
            if (track.info.thumbnail && typeof track.info.thumbnail === 'string') {
                embed.setThumbnail(track.info.thumbnail);
            }
        }

        return channel.send({ embeds: [embed] });
    },

    help: (channel, commands) => {
        // Sadece çalışan komutlar ve düzenli, ferah bir görünüm
        const modernCommands = [
          { name: 'play <şarkı>', emoji: '▶️', description: 'Bir şarkı çal! (Yoksa ben mi söyleyeyim?)' },
          { name: 'pause', emoji: '⏸️', description: 'Müzik durdu... Kahve molası zamanı!' },
          { name: 'resume', emoji: '▶️', description: 'Devam! (Yine dans zamanı 🕺)' },
          { name: 'skip', emoji: '⏭️', description: 'Sıradaki gelsin! (Bu şarkı bana göre değil)' },
          { name: 'stop', emoji: '⏹️', description: 'Müzik bitti, herkes evine! (Şaka şaka)' },
          { name: 'queue', emoji: '📜', description: 'Sıradaki şarkılar burada. (Spoiler: Yine ben varım)' },
          { name: 'nowplaying', emoji: '🎶', description: 'Şu an ne çalıyor? (Tahmin et: Mükemmel bir şey)' },
          { name: 'volume <0-100>', emoji: '🔊', description: 'Sesi ayarla! (Komşular rahatsız olmasın)' },
          { name: 'shuffle', emoji: '🔀', description: 'Karıştır! (Kaderin ellerinde)' },
          { name: 'loop', emoji: '🔁', description: 'Döngüye al! (Aynı şarkı, sonsuz eğlence)' },
          { name: 'remove <sıra>', emoji: '❌', description: 'Sıradan şarkı sil. (Hoşçakal, dostum)' },
          { name: 'clear', emoji: '🧹', description: 'Sırayı temizle! (Tertemiz oldu)' },
          { name: 'status', emoji: '📊', description: 'Botun durumu. (Çalışıyor muyum? Tabii ki!)' },
          { name: 'help', emoji: '🆘', description: 'Yardım menüsü. (Beni çağırdın, geldim)' }
        ];

        const desc = modernCommands.map(cmd =>
          `${cmd.emoji} **${cmd.name}**\n${cmd.description}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
          .setColor(config.embedColor)
          .setTitle('🎤 YÜZÜM LAZIM DEĞİLKİ AMK Müzik Botu Yardım Menüsü')
          .setAuthor({ name: 'DJ Kara Maske', iconURL: channel.client.user.displayAvatarURL() })
          .setDescription(desc)
          .setFooter({ text: 'Prefix: ! • Komutlar için: !play <şarkı adı>' });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('music')
              .setLabel('Müzik Komutları')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🎵'),
            new ButtonBuilder()
              .setCustomId('queue')
              .setLabel('Sıra Komutları')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('📜'),
            new ButtonBuilder()
              .setCustomId('settings')
              .setLabel('Ayarlar')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('⚙️')
          );

        return channel.send({ embeds: [embed], components: [row] });
    }
}; 