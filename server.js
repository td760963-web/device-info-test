
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json({ limit: "10kb" }));

// الصفحة الرئيسية للمشروع
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// فحص حالة الخادم
app.get("/health", (req, res) => {
  res.json({
    status: "online",
    project: "Device Security Lab",
    time: new Date().toISOString()
  });
});

// استقبال تقرير الاختبار
app.post("/submit", async (req, res) => {
  const {
    consent,
    browser,
    language,
    screen,
    timezone,
    deviceMemory,
    logicalCores
  } = req.body || {};

  // يشترط موافقة الشخص على إرسال التقرير
  if (consent !== true) {
    return res.status(403).json({
      error: "Consent is required"
    });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({
      error: "Telegram is not configured"
    });
  }

  // عنوان الاتصال الذي يراه الخادم.
  // لا نثق بترويسة X-Forwarded-For إلا إذا ضُبطت
  // إعدادات الوكيل الموثوق في بيئة الاستضافة.
  const ipAddress = req.socket.remoteAddress || "غير متاح";

  const safe = (value) =>
    String(value ?? "غير متاح").slice(0, 250);

  const report = [
    "🔐 تقرير Device Security Lab",
    "━━━━━━━━━━━━━━━━",
    `🕒 وقت الاتصال: ${new Date().toISOString()}`,
    `🌐 عنوان IP الذي يراه الخادم: ${safe(ipAddress)}`,
    "━━━━━━━━━━━━━━━━",
    `💻 المتصفح/النظام: ${safe(browser)}`,
    `🗣️ اللغة: ${safe(language)}`,
    `🖥️ دقة الشاشة: ${safe(screen)}`,
    `🌍 المنطقة الزمنية: ${safe(timezone)}`,
    `🧠 الذاكرة التقريبية: ${safe(deviceMemory)}`,
    `⚙️ الأنوية المنطقية: ${safe(logicalCores)}`,
    "━━━━━━━━━━━━━━━━",
    "نتيجة اختبار تقني بموافقة المستخدم"
  ].join("\n");

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: report
        })
      }
    );

    if (!telegramResponse.ok) {
      return res.status(502).json({
        error: "Telegram delivery failed"
      });
    }

    return res.json({
      success: true,
      message: "Report sent successfully"
    });
  } catch (error) {
    console.error("Report delivery failed");
    return res.status(502).json({
      error: "Could not send report"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Device Security Lab listening on port ${PORT}`);
});
