const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Profile = require("../../models/Profile");
const { equipment } = require("../../data/phasmophobiaData");
const ShopRole = require("../../models/ShopRole");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Kupuje przedmiot lub rolę ze sklepu.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("Nazwa przedmiotu lub roli, którą chcesz kupić.")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("quantity")
        .setDescription(
          "Ilość (tylko dla przedmiotów zużywalnych). Domyślnie 1."
        )
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();

    const equipmentChoices = equipment.map((item) => item.name);

    const shopRoles = await ShopRole.find({ guildId: interaction.guild.id });
    const roleChoices = await Promise.all(
      shopRoles.map(async (shopRole) => {
        const role = await interaction.guild.roles
          .fetch(shopRole.roleId)
          .catch(() => null);
        return role ? role.name : null;
      })
    );

    const allChoices = [...equipmentChoices, ...roleChoices.filter(Boolean)];
    const filtered = allChoices
      .filter((choice) => choice.toLowerCase().startsWith(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice }))
    );
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const itemName = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("quantity") || 1;

    const userProfile = await Profile.findOneAndUpdate(
      { userId: interaction.user.id, guildId: interaction.guild.id },
      {},
      { upsert: true, new: true }
    );

    const itemToBuy = equipment.find(
      (item) => item.name.toLowerCase() === itemName.toLowerCase()
    );

    if (itemToBuy) {
      const isPermanent = itemToBuy.type !== "consumable";

      if (isPermanent && quantity > 1) {
        return interaction.editReply(
          "Możesz posiadać tylko jedną sztukę tego przedmiotu."
        );
      }

      const totalPrice = itemToBuy.price * quantity;
      if (userProfile.balance < totalPrice) {
        return interaction.editReply(
          `Nie masz wystarczająco pieniędzy! Brakuje ci **$${
            totalPrice - userProfile.balance
          }**.`
        );
      }

      if (userProfile.inventory.has(itemToBuy.name)) {
        if (isPermanent) {
          return interaction.editReply("Już posiadasz ten przedmiot.");
        }

        const currentQuantity = userProfile.inventory.get(itemToBuy.name);
        userProfile.inventory.set(itemToBuy.name, currentQuantity + quantity);
      } else {
        userProfile.inventory.set(itemToBuy.name, quantity);
      }

      userProfile.balance -= totalPrice;
      userProfile.moneySpent = (userProfile.moneySpent || 0) + totalPrice;
      await userProfile.save();

      const embed = new EmbedBuilder()
        .setTitle("✅ Zakup udany!")
        .setDescription(
          `Pomyślnie zakupiono **${itemToBuy.name}** (x${quantity}) za **$${totalPrice}**.`
        )
        .setColor("#2ecc71");
      return interaction.editReply({ embeds: [embed] });
    }

    const role = interaction.guild.roles.cache.find(
      (r) => r.name.toLowerCase() === itemName.toLowerCase()
    );
    if (role) {
      const shopRole = await ShopRole.findOne({
        guildId: interaction.guild.id,
        roleId: role.id,
      });

      if (shopRole) {
        if (quantity > 1) {
          return interaction.editReply("Możesz kupić tylko jedną rolę na raz.");
        }
        if (interaction.member.roles.cache.has(role.id)) {
          return interaction.editReply("Już posiadasz tę rolę.");
        }
        if (userProfile.balance < shopRole.price) {
          return interaction.editReply(
            `Nie masz wystarczająco pieniędzy! Brakuje ci **$${
              shopRole.price - userProfile.balance
            }**.`
          );
        }

        try {
          await interaction.member.roles.add(role.id);
          userProfile.balance -= shopRole.price;
          userProfile.moneySpent =
            (userProfile.moneySpent || 0) + shopRole.price;
          await userProfile.save();

          const embed = new EmbedBuilder()
            .setTitle("✅ Zakupiono Rolę!")
            .setDescription(
              `Pomyślnie zakupiono rolę ${role} za **$${shopRole.price}**.`
            )
            .setColor("#2ecc71");
          return interaction.editReply({ embeds: [embed] });
        } catch (error) {
          console.error("Błąd nadawania roli przy zakupie:", error);
          return interaction.editReply(
            "Wystąpił błąd podczas nadawania roli. Upewnij się, że moja rola jest wyżej niż rola, którą próbujesz kupić."
          );
        }
      }
    }

    return interaction.editReply(
      "Nie znaleziono takiego przedmiotu ani roli w sklepie."
    );
  },
};
