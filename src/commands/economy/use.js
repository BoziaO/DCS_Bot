const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Profile = require("../../models/Profile");

const USABLE_ITEMS = {
  "Tabletki na poczytalność (Sanity Pills)": {
    /**
     * @param {import('mongoose').Document & {sanity: number}} userProfile - Profil użytkownika z Mongoose.
     * @returns {{success: boolean, message: string}} - Obiekt z wynikiem operacji.
     */
    applyEffect: (userProfile) => {
      if (userProfile.sanity >= 100) {
        return {
          success: false,
          message: "Twoja poczytalność jest już na maksymalnym poziomie!",
        };
      }
      userProfile.sanity = Math.min(100, userProfile.sanity + 40);
      return {
        success: true,
        message:
          "Połknąłeś tabletki. Czujesz, jak strach powoli ustępuje, a umysł się rozjaśnia.",
      };
    },
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("use")
    .setDescription("Użyj przedmiotu ze swojego ekwipunku.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Przedmiot, którego chcesz użyć.")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const userProfile = await Profile.findOne({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    });

    if (!userProfile || !userProfile.inventory) {
      return interaction.respond([]);
    }

    const userUsableItems = Array.from(userProfile.inventory.entries())
      .filter(
        ([itemName, quantity]) =>
          Object.keys(USABLE_ITEMS).includes(itemName) && quantity > 0
      )
      .map(([itemName]) => ({ name: itemName, value: itemName }));

    await interaction.respond(userUsableItems);
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const itemName = interaction.options.getString("item");
    const itemDefinition = USABLE_ITEMS[itemName];

    if (!itemDefinition) {
      return interaction.editReply({
        content:
          "Tego przedmiotu nie można użyć w ten sposób lub nie istnieje.",
      });
    }

    const userProfile = await Profile.findOne({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    });

    if (
      !userProfile ||
      !userProfile.inventory.has(itemName) ||
      userProfile.inventory.get(itemName) <= 0
    ) {
      return interaction.editReply({
        content: `Nie masz w ekwipunku przedmiotu: **${itemName}**.`,
      });
    }

    const result = itemDefinition.applyEffect(userProfile);

    if (result.success) {
      const currentQuantity = userProfile.inventory.get(itemName);
      userProfile.inventory.set(itemName, currentQuantity - 1);

      if (userProfile.inventory.get(itemName) <= 0) {
        userProfile.inventory.delete(itemName);
      }

      userProfile.itemsUsed = (userProfile.itemsUsed || 0) + 1;
      if (itemName === "Tabletki na poczytalność (Sanity Pills)") {
        userProfile.pillsUsed = (userProfile.pillsUsed || 0) + 1;
      }

      const favItem = userProfile.favoriteEquipment.find(
        (i) => i.name === itemName
      );
      if (favItem) {
        favItem.uses = (favItem.uses || 0) + 1;
      } else {
        userProfile.favoriteEquipment.push({ name: itemName, uses: 1 });
      }

      await userProfile.save();

      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Użyto przedmiotu!")
        .setDescription(result.message)
        .setColor("#2ecc71")
        .addFields({ name: "Przedmiot", value: itemName });

      await interaction.editReply({ embeds: [successEmbed] });
    } else {
      await interaction.editReply({ content: result.message });
    }
  },
};
