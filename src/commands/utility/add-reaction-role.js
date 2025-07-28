const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const ReactionRole = require("../../models/ReactionRole");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-reaction-role")
    .setDescription("Dodaje rolę za reakcję do istniejącego panelu.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("id_wiadomosci")
        .setDescription("ID wiadomości panelu, do której chcesz dodać rolę.")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("rola")
        .setDescription("Rola, która ma być nadana.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("emoji")
        .setDescription("Emoji, które ma być powiązane z rolą.")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString("id_wiadomosci");
    const role = interaction.options.getRole("rola");
    const emoji = interaction.options.getString("emoji");

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.editReply(
        "Nie mogę zarządzać tą rolą, ponieważ jest na tym samym lub wyższym poziomie co moja. Przesuń moją rolę wyżej."
      );
    }

    try {
      let message;
      const textChannels = interaction.guild.channels.cache.filter((c) =>
        c.isTextBased()
      );

      for (const channel of textChannels.values()) {
        try {
          message = await channel.messages.fetch(messageId);
          if (message) break;
        } catch (error) {
          if (error.code !== 10008) {
            console.error(
              `[ReactionRole] Błąd podczas przeszukiwania kanału ${channel.id}:`,
              error
            );
          }
        }
      }

      if (!message) {
        return interaction.editReply(
          "Nie znaleziono wiadomości o podanym ID na tym serwerze. Upewnij się, że ID jest poprawne i mam dostęp do kanału."
        );
      }

      const newReactionRole = new ReactionRole({
        guildId: interaction.guild.id,
        messageId: message.id,
        roleId: role.id,
        emoji: emoji,
      });
      await newReactionRole.save();

      await message.react(emoji);

      const embed = EmbedBuilder.from(message.embeds[0]);
      const currentDescription = embed.data.description || "";
      const newDescriptionLine = `\n${emoji} - ${role.toString()}`;
      embed.setDescription(currentDescription + newDescriptionLine);
      await message.edit({ embeds: [embed] });

      await interaction.editReply(
        `✅ Pomyślnie dodano rolę ${role.name} za reakcję ${emoji} do panelu.`
      );
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return interaction.editReply(
          "Ta kombinacja emoji i wiadomości jest już w użyciu."
        );
      }
      if (error.code === 10014) {
        return interaction.editReply(
          "Nieprawidłowe emoji. Upewnij się, że jest to standardowe emoji lub emoji z serwera, na którym jestem."
        );
      }
      await interaction.editReply(
        "Wystąpił nieoczekiwany błąd. Sprawdź konsolę."
      );
    }
  },
};
