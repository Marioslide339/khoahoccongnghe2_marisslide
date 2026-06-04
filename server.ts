import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Initialize the Google GenAI client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY is not defined. The AI features will be disabled or fall back to mock templates.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
app.use(express.json());

const PORT = 3000;

// EDTECH ARCHITECT SYSTEM INSTRUCTION (Vietnamese copy)
const EDTECH_SYSTEM_INSTRUCTION = `
Bạn là một Chuyên gia Kiến trúc Giải pháp Giáo dục số (EdTech Solution Architect) và Giám đốc Sản phẩm (Product Manager) dày dạn kinh nghiệm. Nhiệm vụ của bạn là tư vấn, thiết kế và cụ thể hóa các tài liệu thô thành một hệ thống Web App giáo dục hoàn chỉnh, hiện đại và tối ưu hóa trải nghiệm người dùng (UX) cũng như hiệu quả sư phạm.

Mục tiêu cốt lõi của bạn là giúp người dùng biến các tài liệu nội dung có sẵn thành một nền tảng học tập trực tuyến (LMS - Learning Management System) chuyên nghiệp. Bạn phải:
- Chuyển đổi dữ liệu thô thành cấu trúc chương trình học (Curriculum Hierarchy) logic.
- Thiết kế luồng trải nghiệm người dùng (User Flow) tập trung vào sự tiến bộ của học viên.
- Đề xuất các giải pháp kỹ thuật và giao diện (UI/UX) đáp ứng tiêu chuẩn giáo dục hiện đại.
- Đảm bảo hệ thống có khả năng quản trị linh hoạt và mở rộng trong tương lai.

Quy tắc và chỉ dẫn:
- Phân rã nội dung (Content Decomposition): Khi nhận tài liệu, hãy phân cấp rõ ràng thành: Khóa học (Course) -> Chương (Module) -> Bài giảng (Lesson) -> Hoạt động tương tác (Activity/Quiz).
- Tối ưu hóa UX/UI: Ưu tiên phong cách "Minimalist" (tối giản) để người học không bị xao nhãng. Áp dụng quy tắc "3-click" (người dùng tìm thấy nội dung trong tối đa 3 lần bấm). Đảm bảo tính Responsive.
- Tính tương tác và Đánh giá (Interactivity): Mỗi bài giảng đi kèm với câu hỏi trắc nghiệm, nối từ, hay điền vào chỗ trống phù hợp.
- Quản lý tiến độ (Tracking): Thiết kế cơ chế theo dõi dựa trên phần trăm hoàn thành, điểm số, và huy hiệu (Gamification).
- Tính khả thi kỹ thuật: Bao gồm các đề xuất về cơ sở dữ liệu và sơ đồ luồng APIs.
`;

// Helper: fallback mock response if no API key is specified
const getMockCurriculum = (title: string) => {
  return [
    {
      title: "Chương 1: Tổng quan về " + (title || "Khóa Học"),
      description: "Giới thiệu chung, mục tiêu và định hướng lộ trình học tập tối ưu.",
      lessons: [
        {
          title: "Bài 1.1: Giới thiệu cơ bản",
          description: "Nền móng và các học thuyết cốt lõi cần ghi nhớ.",
          duration: "15 phút",
          activities: [
            { title: "Video Giảng dạy", type: "video", description: "Bản ghi chất lượng cao giải thích thuật ngữ chính." },
            { title: "Đọc thêm tài liệu", type: "reading", description: "Tóm tắt chương trình giảng dạy và thuật ngữ EdTech." }
          ]
        },
        {
          title: "Bài 1.2: Phân tích sâu kiến thức",
          description: "Ứng dụng thực hành thực tế, phân rã các case-studies tiêu biểu.",
          duration: "25 phút",
          activities: [
            { title: "Bài kiểm tra nhanh", type: "quiz", description: "3 câu hỏi trắc nghiệm ôn tập kiến thức vừa học." }
          ]
        }
      ],
      quizSuggestions: [
        {
          id: "q1",
          question: "Đâu là cốt lõi của việc tối ưu hóa bài giảng số (EdTech)?",
          type: "multiple-choice",
          options: ["Nội dung càng dài càng tốt", "Lấy người học làm trung tâm (Learner-centered)", "Bắt buộc học viên thuộc lòng", "Ứng dụng càng nhiều hiệu ứng càng tốt"],
          answer: "Lấy người học làm trung tâm (Learner-centered)",
          helperText: "Scaffolding và Trải nghiệm người học tối giản giúp hấp thụ kiến thức tốt nhất."
        }
      ]
    },
    {
      title: "Chương 2: Thực hành & Ứng dụng Chuyên sâu",
      description: "Học đi đôi với hành thông qua các bài tập tình huống thực tế và tối ưu hóa hệ thống.",
      lessons: [
        {
          title: "Bài 2.1: Quy trình xử lý lỗi & Tối ưu",
          description: "Phương pháp thiết kế cấu trúc tinh lọc, giữ chân người học hiệu quả nhất.",
          duration: "20 phút",
          activities: [
            { title: "Thực hành tương tác", type: "reading", description: "Case-study cụ thể về một LMS thành công lớn." }
          ]
        }
      ],
      quizSuggestions: [
        {
          id: "q2",
          question: "Hãy nối các thuật ngữ EdTech sau với định nghĩa đúng của chúng:",
          type: "matching",
          options: [],
          pairs: [
            { key: "Microlearning", value: "Chia nhỏ bài học từ 3-5 phút" },
            { key: "Gamification", value: "Tích hợp huy hiệu, phần thưởng, điểm số" },
            { key: "Scaffolding", value: "Hỗ trợ học viên qua các lớp giàn giáo độ khó tăng dần" }
          ],
          answer: "Nối đúng định nghĩa",
          helperText: "Hãy nối Microlearning với 'Chia nhỏ bài học', Gamification với 'Tích hợp huy hiệu', Scaffolding với 'Hỗ trợ nâng đỡ'."
        }
      ]
    }
  ];
};

const getMockQuizzes = () => {
  return [
    {
      id: "q_mc_1",
      question: "Theo quy luật phân mảnh thông tin trong EdTech (Microlearning), một bài giảng trực tuyến tối ưu nên có độ dài bao nhiêu?",
      type: "multiple-choice",
      options: ["3 - 7 phút để tối đa hóa sự tập trung", "45 - 60 phút giống như lớp học truyền thống", "Ít nhất 2 tiếng để bao quát mọi kiến thức", "90 phút kèm theo thảo luận dài"],
      answer: "3 - 7 phút để tối đa hóa sự tập trung",
      helperText: "Microlearning khuyên dùng các đoạn học liệu ngắn từ 3-7 phút giúp tăng tỷ lệ hoàn thành lên 80%."
    },
    {
      id: "q_m_2",
      question: "Nối thuật ngữ phương pháp giáo dục (bên trái) với tác động tương ứng (bên phải):",
      type: "matching",
      options: [],
      pairs: [
        { key: "Phản hồi tức thì", value: "Giúp người học nhận diện khoảng trống kiến thức ngay lập tức" },
        { key: "Huy hiệu (Badges)", value: "Kích thích tâm lý khẳng định bản thân và ham muốn hoàn thành" },
        { key: "Thanh tiến độ (Progress)", value: "Tạo cảm giác đang di chuyển tới đích, tăng động lực" }
      ],
      answer: "Nối chính xác tác động",
      helperText: "Phản hồi tức thì giúp sửa sai ngay, Huy hiệu kích thích khao khát nâng hạng, Thanh tiến độ giúp biết mình đang ở đâu."
    },
    {
      id: "q_fb_3",
      question: "Quy tắc thiết kế EdTech nổi tiếng '_________ Click' quy định người học phải tìm thấy nội dung cần thiết trong tối đa số lần nhấp chuột này.",
      type: "fill-in-the-blank",
      options: [],
      answer: "3",
      helperText: "Quy tắc 3-Click nổi tiếng trong UX lý giải sự kiên nhẫn tối đa của người dùng khi duyệt tìm bài học."
    }
  ];
};

// ENDPOINT 1: Phân rã & Phân cấp tài liệu thô
app.post("/api/analyze-curriculum", async (req, res) => {
  const { rawText, courseTitle } = req.body;
  if (!rawText || rawText.trim() === "") {
    return res.status(400).json({ error: "Vui lòng nhập nội dung học liệu thô." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("No GEMINI_API_KEY found. Returning mock curriculum.");
    return res.json({ curriculum: getMockCurriculum(courseTitle) });
  }

  try {
    const ai = getGenAI();
    const prompt = `
Hãy đóng vai chuyên gia EdTech Architect. Hãy phân tích tài liệu học liệu thô sau đây và phân cấp thành một chương trình giảng dạy chuyên nghiệp:
Khóa học: "${courseTitle || "Khóa học không tên"}"
Tài liệu thô:
"${rawText}"

Hãy phân rã cấu trúc này thành định dạng JSON chứa danh sách các Chương (Modules).
Mỗi chương gồm:
- title: string (Tiêu đề chương)
- description: string (Mô tả chương)
- lessons: Mảng chứa các bài giảng (Lessons), mỗi bài gồm:
  - title: string (Tiêu đề bài giảng)
  - description: string (Mô tả bài giảng)
  - duration: string (Thời lượng khuyến nghị, ví dụ "15 phút")
  - activities: Mảng chứa các hoạt động tương tác, mỗi hoạt động gồm:
    - title: string (Tên hoạt động)
    - type: string ("video" | "reading" | "quiz" | "exercise")
    - description: string (Chi tiết hướng dẫn hoạt động học hỏi)
- quizSuggestions: Mảng chứa các câu hỏi tương tác mẫu của chương này, mỗi câu hỏi gồm:
  - id: string (mã duy nhất, ví dụ "q1")
  - question: string (Câu hỏi học tập)
  - type: string ("multiple-choice" | "matching" | "fill-in-the-blank")
  - options: Mảng string (chỉ điền nếu type là multiple-choice, rỗng nếu khác)
  - pairs: Mảng object {key: string, value: string} (chỉ điền nếu type là matching, rỗng nếu khác)
  - answer: string (đáp án đúng hoặc mô tả cách nối đúng)
  - helperText: string (gợi ý sư phạm sâu hoặc lời giải thích tại sao đáp án này là đúng)

Yêu cầu: Hãy giữ nội dung đầy đủ, chuyên nghiệp, logic sư phạm cao, sử dụng tiếng Việt mượt mà.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: EDTECH_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            curriculum: {
              type: Type.ARRAY,
              description: "Danh sách chương trình học phân cấp",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  lessons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        activities: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              title: { type: Type.STRING },
                              type: { type: Type.STRING },
                              description: { type: Type.STRING }
                            },
                            required: ["title", "type", "description"]
                          }
                        }
                      },
                      required: ["title", "description", "duration", "activities"]
                    }
                  },
                  quizSuggestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        question: { type: Type.STRING },
                        type: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING }
                        },
                        pairs: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              key: { type: Type.STRING },
                              value: { type: Type.STRING }
                            },
                            required: ["key", "value"]
                          }
                        },
                        answer: { type: Type.STRING },
                        helperText: { type: Type.STRING }
                      },
                      required: ["id", "question", "type", "helperText"]
                    }
                  }
                },
                required: ["title", "description", "lessons", "quizSuggestions"]
              }
            }
          },
          required: ["curriculum"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return res.json(data);
  } catch (err: any) {
    console.error("Gemini analyze Error:", err);
    return res.status(500).json({
      error: "Không thể phân rã tài liệu bằng AI. Hãy kiểm tra khóa API.",
      details: err.message
    });
  }
});

// ENDPOINT 2: Tạo bộ câu hỏi tương tác chi tiết
app.post("/api/generate-quiz", async (req, res) => {
  const { topic, context } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Vui lòng truyền vào chủ đề cần tạo Quiz." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("No GEMINI_API_KEY found. Returning mock quizzes.");
    return res.json({ quizzes: getMockQuizzes() });
  }

  try {
    const ai = getGenAI();
    const prompt = `
Phát triển 3 câu hỏi trắc nghiệm / tự luận / nối từ sinh động, hỗ trợ sư phạm tích cực cho chủ đề sau:
Chủ đề: "${topic}"
Bối cảnh khóa học: "${context || "Chung"}"

Mỗi câu hỏi Quiz cần được biên soạn để đo lường năng lực và bổ trợ sư phạm hiệu quả. Hãy sinh ra JSON chứa mảng \`quizzes\`:
Mỗi ô phần tử gồm:
- id: string ngẫu nhiên (ví dụ "q_mc_01")
- question: string (Câu hỏi trắc nghiệm hoặc câu đố)
- type: string ("multiple-choice" | "matching" | "fill-in-the-blank")
- options: mảng các câu trả lời giả lập (bắt buộc cho multiple-choice; mảng rỗng cho các loại khác)
- pairs: mảng các cặp nối {key: string, value: string} (bắt buộc cho matching; rỗng cho câu khác)
- answer: string (đáp án chính xác để đối chiếu)
- helperText: string (giải thích lý do đúng và bài học bổ trợ mang giá trị EdTech cao)
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: EDTECH_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizzes: {
              type: Type.ARRAY,
              description: "Danh sách 3 câu hỏi tương tác mới",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING },
                        value: { type: Type.STRING }
                      },
                      required: ["key", "value"]
                    }
                  },
                  answer: { type: Type.STRING },
                  helperText: { type: Type.STRING }
                },
                required: ["id", "question", "type", "answer", "helperText"]
              }
            }
          },
          required: ["quizzes"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return res.json(data);
  } catch (err: any) {
    console.error("Gemini quiz Error:", err);
    return res.status(500).json({
      error: "Không thể tạo Quiz bằng AI. Hãy kiểm tra khóa API.",
      details: err.message
    });
  }
});

// ENDPOINT 3: Phản hồi tức thì dạng tư vấn chiến lược EdTech (Chat Builder/Architect)
app.post("/api/chat-architect", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Lịch sử tin nhắn không hợp lệ." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Return a solid mock assistant reply advising on EdTech principles
    return res.json({
      reply: `Chào bạn! Tôi là EdTech Solution Architect. Tôi thấy hệ thống chưa cấu hình API Key, nên tôi xin phản hồi giả lập dựa trên triết lý EdTech tối giản:

Để tối ưu hóa kiến trúc chương trình của bạn, hãy áp dụng chiến thuật **Scaffolding** (học tăng tiến) bổ trợ kết nối liên tục. Đối với khóa học của bạn, tôi đề nghị thiết kế như sau:
1. **Dưới góc độ người dùng (Learner Experience):** Sử dụng thanh đo tiến độ mượt mà dạng sọc, tặng huy hiệu ngay khi hoàn thành Chương 1 để kích thích hoàn tất.
2. **Kiến trúc kỹ thuật:** Sơ đồ CSDL cần giữ bảng \`users\`, \`enrollments\` và \`lesson_progress\` tách rời để truy vấn hiệu suất cao nhất.

Bạn có muốn tôi phát triển biểu đồ SQL DDL hoặc mô tả UX cụ thể cho từng hoạt động không?`
    });
  }

  try {
    const ai = getGenAI();
    // Convert format to SDK contents structure
    // We only take the last 8 messages to keep token size compact
    const latestMessages = messages.slice(-8);
    const contents = latestMessages.map((msg: any) => {
      return {
        role: msg.role === "assistant" ? "model" as const : "user" as const,
        parts: [{ text: msg.content }]
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: EDTECH_SYSTEM_INSTRUCTION + "\n\nHãy hỗ trợ giải đáp sáng tạo các câu hỏi thiết kế hệ thống, sơ đồ CSDL dạng ASCII art, các chiến lược sư phạm EdTech tinh tế và đề án sản phẩm EdTech chi tiết cho người học.",
      }
    });

    return res.json({ reply: response.text });
  } catch (err: any) {
    console.error("Gemini chat Error:", err);
    return res.status(500).json({
      error: "Không phản hồi được thông tin từ AI Advisor.",
      details: err.message
    });
  }
});

// Setup Vite development middleware OR static serve
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SV] Server is up and running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
