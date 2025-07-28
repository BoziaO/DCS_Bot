const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Wyrzuca użytkownika z serwera.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Użytkownik do wyrzucenia.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Powód wyrzucenia.")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "Nie podano powodu.";
    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!targetMember) {
      return interaction.editReply({
        content: "Nie można znaleźć tego użytkownika na serwerze.",
        ephemeral: true,
      });
    }

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({
        content: "Nie możesz wyrzucić samego siebie.",
        ephemeral: true,
      });
    }

    if (targetUser.id === interaction.client.user.id) {
      return interaction.editReply({
        content: "Nie mogę wyrzucić samego siebie.",
        ephemeral: true,
      });
    }

    if (
      targetMember.roles.highest.position >=
        interaction.member.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      return interaction.editReply({
        content:
          "Nie możesz wyrzucić użytkownika, który ma taką samą lub wyższą rolę.",
        ephemeral: true,
      });
    }

    if (!targetMember.kickable) {
      return interaction.editReply({
        content:
          "Nie mogę wyrzucić tego użytkownika. Prawdopodobnie ma wyższą rolę ode mnie lub nie mam uprawnień.",
        ephemeral: true,
      });
    }

    try {
      const kickEmbed = new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("Zostałeś wyrzucony!")
        .setDescription(
          `Zostałeś wyrzucony z serwera **${interaction.guild.name}**.`
        )
        .addFields(
          { name: "Powód", value: reason },
          { name: "Wyrzucony przez", value: interaction.user.tag }
        )
        .setTimestamp()
        .setFooter({ text: `ID Użytkownika: ${targetUser.id}` });

      await targetUser.send({ embeds: [kickEmbed] }).catch((err) => {
        console.log(
          `Nie udało się wysłać wiadomości DM do ${targetUser.tag}. Błąd: ${err.message}`
        );
      });

      await targetMember.kick(
        `${reason} (Wyrzucony przez: ${interaction.user.tag})`
      );

      const successEmbed = new EmbedBuilder()
        .setColor("#2ed573")
        .setTitle("Użytkownik wyrzucony")
        .setDescription(`Pomyślnie wyrzucono **${targetUser.tag}**.`)
        .addFields({ name: "Powód", value: reason })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
      console.error(`Błąd podczas wyrzucania użytkownika:`, error);
      await interaction.editReply({
        content: "Wystąpił błąd podczas próby wyrzucenia użytkownika.",
        ephemeral: true,
      });
    }
  },
};
