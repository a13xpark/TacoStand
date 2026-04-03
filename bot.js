const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
} = require("discord.js");

// ─── CONFIG ───────────────────────────────────────────────────────
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID || ""; // optional
// ──────────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── Register slash command ──────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName("upload")
    .setDescription("List an item for sale on TacoStand")
    .addStringOption((opt) =>
      opt.setName("name").setDescription("Product name").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("price").setDescription("Price (e.g. $3)").setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName("seller").setDescription("The seller").setRequired(true)
    )
    .addAttachmentOption((opt) =>
      opt
        .setName("image")
        .setDescription("Image or video preview of the product")
        .setRequired(false)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅  TacoStand is online as ${client.user.tag}`);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅  Slash commands registered globally.");
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

// ─── Handle /upload ──────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  // ── Slash command ────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === "upload") {
    const name = interaction.options.getString("name");
    const price = interaction.options.getString("price");
    const seller = interaction.options.getUser("seller");
    const image = interaction.options.getAttachment("image");

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "TacoStand",
        iconURL: interaction.guild?.iconURL() || undefined,
      })
      .setTitle(name)
      .setColor(0xff4500) // taco-orange 🌮
      .addFields(
        { name: "Price", value: price, inline: true },
        { name: "Seller", value: `${seller}`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "TacoStand • Click Purchase to buy" });

    if (image) {
      embed.setImage(image.url);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`purchase_${seller.id}_${name}_${price}`)
        .setLabel("Purchase")
        .setStyle(ButtonStyle.Danger) // red button like in your screenshot
        .setEmoji("🌮")
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // ── Purchase button ──────────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith("purchase_")) {
    const parts = interaction.customId.split("_");
    // format: purchase_<sellerID>_<name>_<price>
    const sellerId = parts[1];
    const productName = parts.slice(2, -1).join("_");
    const productPrice = parts[parts.length - 1];
    const buyer = interaction.user;

    // Prevent buying your own listing
    if (buyer.id === sellerId) {
      return interaction.reply({
        content: "❌ You can't purchase your own listing!",
        ephemeral: true,
      });
    }

    const guild = interaction.guild;
    if (!guild) return;

    const seller = await guild.members.fetch(sellerId).catch(() => null);
    if (!seller) {
      return interaction.reply({
        content: "❌ Seller not found in this server.",
        ephemeral: true,
      });
    }

    // Create a private ticket channel
    const ticketName = `ticket-${buyer.username}-${Date.now().toString(36)}`;

    const channelOptions = {
      name: ticketName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone — deny
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: buyer.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: sellerId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
          ],
        },
      ],
    };

    if (TICKET_CATEGORY_ID) {
      channelOptions.parent = TICKET_CATEGORY_ID;
    }

    const ticketChannel = await guild.channels.create(channelOptions);

    const ticketEmbed = new EmbedBuilder()
      .setTitle("🌮 TacoStand — New Purchase")
      .setColor(0xff4500)
      .addFields(
        { name: "Product", value: productName, inline: true },
        { name: "Price", value: productPrice, inline: true },
        { name: "Buyer", value: `${buyer}`, inline: true },
        { name: "Seller", value: `${seller}`, inline: true }
      )
      .setDescription(
        `Hey ${seller}, someone wants to buy **${productName}**!\n\nPlease send your **PayPal details** in this channel so the buyer can pay.`
      )
      .setTimestamp()
      .setFooter({ text: "TacoStand Ticket System" });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔒")
    );

    await ticketChannel.send({
      content: `${seller} ${buyer} — a new ticket has been opened!`,
      embeds: [ticketEmbed],
      components: [closeRow],
    });

    await interaction.reply({
      content: `✅ Ticket created! Head over to ${ticketChannel} to complete your purchase.`,
      ephemeral: true,
    });
  }

  // ── Close ticket button ──────────────────────────────────────
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    const channel = interaction.channel;
    await interaction.reply({
      content: "🔒 This ticket will be closed in 5 seconds...",
    });
    setTimeout(() => {
      channel.delete().catch(console.error);
    }, 5000);
  }
});

// ─── Login ───────────────────────────────────────────────────────
client.login(TOKEN);
