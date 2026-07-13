// Shared mock product catalog used by all platform adapters when real
//联盟 API credentials are unavailable (which is the default in this demo).
//
// The catalog is intentionally rich and Chinese/English mixed so the AI
// analyzer has realistic material to score and write copy for.

export interface MockSeed {
  title: string;
  category: string;
  basePrice: number;
  commissionRange: [number, number]; // %
  salesRange: [number, number];
  ratingRange: [number, number];
  reviewRange: [number, number];
  couponRange: [number, number]; // absolute amount
  shop: string;
  imageQuery: string;
  isVirtual?: boolean; // true for 软件/SaaS/会员点卡/课程/数字内容
  deliveryType?: "digital" | "physical"; // 配送方式
}

export const MOCK_CATALOG: MockSeed[] = [
  // —— 数码电子 ——
  { title: "无线降噪蓝牙耳机 头戴式 Hi-Res 高保真音质", category: "数码电子", basePrice: 299, commissionRange: [12, 20], salesRange: [800, 5200], ratingRange: [4.5, 4.9], reviewRange: [1200, 9800], couponRange: [20, 80], shop: "声学旗舰店", imageQuery: "wireless headphones" },
  { title: "智能手表运动健康监测 心率血氧 GPS 长续航", category: "数码电子", basePrice: 459, commissionRange: [10, 18], salesRange: [500, 3800], ratingRange: [4.4, 4.8], reviewRange: [800, 6500], couponRange: [30, 100], shop: "智能穿戴旗舰店", imageQuery: "smart watch" },
  { title: "便携式移动电源 20000mAh PD快充 数显", category: "数码电子", basePrice: 129, commissionRange: [15, 25], salesRange: [1500, 9800], ratingRange: [4.6, 4.9], reviewRange: [2000, 15000], couponRange: [10, 40], shop: "能源数码专营", imageQuery: "power bank" },
  { title: "机械键盘客制化 热插拔 RGB 三模无线", category: "数码电子", basePrice: 389, commissionRange: [8, 15], salesRange: [300, 2600], ratingRange: [4.5, 4.9], reviewRange: [500, 4200], couponRange: [20, 60], shop: "极客外设店", imageQuery: "mechanical keyboard" },
  { title: "4K高清投影仪 家庭影院 智能自动对焦", category: "数码电子", basePrice: 1599, commissionRange: [6, 12], salesRange: [120, 980], ratingRange: [4.3, 4.8], reviewRange: [200, 1800], couponRange: [100, 400], shop: "家庭影院官方店", imageQuery: "projector 4k" },

  // —— 家居家纺 ——
  { title: "北欧风加厚珊瑚绒毯子 沙发盖毯 床上保暖", category: "家居家纺", basePrice: 89, commissionRange: [18, 28], salesRange: [2000, 12000], ratingRange: [4.6, 4.9], reviewRange: [3000, 22000], couponRange: [10, 30], shop: "暖居生活馆", imageQuery: "coral fleece blanket" },
  { title: "乳胶枕头护颈 泰国进口 天然橡胶助眠", category: "家居家纺", basePrice: 159, commissionRange: [15, 22], salesRange: [1000, 8000], ratingRange: [4.5, 4.8], reviewRange: [1500, 12000], couponRange: [20, 60], shop: "睡眠博士旗舰店", imageQuery: "latex pillow" },
  { title: "全棉四件套 60支长绒棉 酒店级床品", category: "家居家纺", basePrice: 399, commissionRange: [12, 20], salesRange: [600, 4500], ratingRange: [4.7, 4.9], reviewRange: [1000, 9000], couponRange: [50, 150], shop: "居家优品", imageQuery: "cotton bedding set" },
  { title: "智能感应垃圾桶 厨房家用 免手摇一键开盖", category: "家居家纺", basePrice: 199, commissionRange: [14, 22], salesRange: [800, 5500], ratingRange: [4.4, 4.8], reviewRange: [900, 7800], couponRange: [20, 60], shop: "智净家居", imageQuery: "smart trash can" },

  // —— 厨房小电 ——
  { title: "空气炸锅家用无油 5.5L大容量 智能预设菜单", category: "厨房小电", basePrice: 329, commissionRange: [10, 18], salesRange: [1200, 9000], ratingRange: [4.6, 4.9], reviewRange: [2000, 16000], couponRange: [30, 120], shop: "厨电官方店", imageQuery: "air fryer" },
  { title: "破壁机家用静音 加热多功能辅食料理", category: "厨房小电", basePrice: 499, commissionRange: [8, 15], salesRange: [500, 3800], ratingRange: [4.4, 4.8], reviewRange: [700, 6500], couponRange: [40, 150], shop: "料理小家电", imageQuery: "blender kitchen" },
  { title: "便携式榨汁机 USB充电 随行杯果汁机", category: "厨房小电", basePrice: 99, commissionRange: [20, 30], salesRange: [1800, 11000], ratingRange: [4.5, 4.9], reviewRange: [2500, 19000], couponRange: [10, 30], shop: "轻饮生活", imageQuery: "portable juicer" },

  // —— 美妆个护 ——
  { title: "玻尿酸保湿精华液 烟酰胺提亮 30ml", category: "美妆个护", basePrice: 159, commissionRange: [22, 35], salesRange: [2500, 18000], ratingRange: [4.6, 4.9], reviewRange: [4000, 28000], couponRange: [20, 60], shop: "肌肤之钥", imageQuery: "serum skincare" },
  { title: "氨基酸洁面乳 温和清洁 控油祛痘 100g", category: "美妆个护", basePrice: 69, commissionRange: [25, 38], salesRange: [3000, 22000], ratingRange: [4.7, 4.9], reviewRange: [5000, 35000], couponRange: [10, 25], shop: "本草护肤", imageQuery: "facial cleanser" },
  { title: "电动牙刷声波震动 USB充电 五档模式", category: "美妆个护", basePrice: 129, commissionRange: [18, 28], salesRange: [2000, 14000], ratingRange: [4.5, 4.9], reviewRange: [3000, 22000], couponRange: [20, 50], shop: "口腔护理旗舰", imageQuery: "electric toothbrush" },

  // —— 母婴玩具 ——
  { title: "婴儿纸尿裤超薄透气 S-XL全码 整箱装", category: "母婴玩具", basePrice: 199, commissionRange: [12, 20], salesRange: [1500, 10000], ratingRange: [4.7, 4.9], reviewRange: [3000, 25000], couponRange: [30, 80], shop: "母婴官方店", imageQuery: "baby diapers" },
  { title: "STEM积木拼装玩具 益智启蒙 800pcs", category: "母婴玩具", basePrice: 149, commissionRange: [15, 25], salesRange: [800, 6000], ratingRange: [4.6, 4.9], reviewRange: [1200, 9500], couponRange: [20, 50], shop: "益智玩具馆", imageQuery: "building blocks toy" },
  { title: "儿童学习桌椅可升降 防近视矫姿", category: "母婴玩具", basePrice: 899, commissionRange: [8, 15], salesRange: [200, 1500], ratingRange: [4.5, 4.8], reviewRange: [400, 3200], couponRange: [80, 250], shop: "成长学习桌", imageQuery: "kids study desk" },

  // —— 运动户外 ——
  { title: "瑜伽垫加厚防滑 TPE环保 初学者健身", category: "运动户外", basePrice: 79, commissionRange: [20, 32], salesRange: [2000, 15000], ratingRange: [4.6, 4.9], reviewRange: [3000, 24000], couponRange: [10, 30], shop: "运动生活馆", imageQuery: "yoga mat" },
  { title: "可调节哑铃一对 家用健身 男女通用", category: "运动户外", basePrice: 259, commissionRange: [10, 18], salesRange: [600, 4200], ratingRange: [4.5, 4.8], reviewRange: [800, 6500], couponRange: [30, 80], shop: "力量训练专营", imageQuery: "dumbbell set" },
  { title: "户外露营帐篷全自动 防雨防晒 4-6人", category: "运动户外", basePrice: 399, commissionRange: [12, 20], salesRange: [400, 3200], ratingRange: [4.4, 4.8], reviewRange: [600, 4800], couponRange: [50, 120], shop: "山野露营", imageQuery: "camping tent" },

  // —— 食品保健 ——
  { title: "蓝山挂耳咖啡 10g×20片 新鲜烘焙", category: "食品保健", basePrice: 59, commissionRange: [25, 38], salesRange: [3000, 20000], ratingRange: [4.7, 4.9], reviewRange: [5000, 38000], couponRange: [10, 20], shop: "精品咖啡", imageQuery: "drip coffee" },
  { title: "坚果零食大礼包 每日坚果 混合装30包", category: "食品保健", basePrice: 89, commissionRange: [18, 28], salesRange: [2500, 18000], ratingRange: [4.6, 4.9], reviewRange: [4000, 30000], couponRange: [15, 30], shop: "休闲食品", imageQuery: "mixed nuts snack" },
  { title: "益生菌粉冲剂 肠道调理 30袋装", category: "食品保健", basePrice: 129, commissionRange: [20, 30], salesRange: [1200, 9000], ratingRange: [4.5, 4.8], reviewRange: [1800, 14000], couponRange: [20, 50], shop: "健康保健", imageQuery: "probiotic powder" },

  // —— 服饰箱包 ——
  { title: "羊毛混纺大衣 中长款 修身显瘦 秋冬", category: "服饰箱包", basePrice: 599, commissionRange: [12, 20], salesRange: [300, 2200], ratingRange: [4.5, 4.8], reviewRange: [500, 3800], couponRange: [80, 200], shop: "轻奢女装", imageQuery: "wool coat" },
  { title: "真皮单肩包女 通勤大容量 商务", category: "服饰箱包", basePrice: 399, commissionRange: [15, 24], salesRange: [500, 3500], ratingRange: [4.6, 4.9], reviewRange: [800, 6200], couponRange: [50, 150], shop: "皮具工坊", imageQuery: "leather handbag" },
  { title: "运动跑步鞋男 透气减震 轻量网面", category: "服饰箱包", basePrice: 269, commissionRange: [10, 18], salesRange: [1000, 7500], ratingRange: [4.5, 4.8], reviewRange: [1500, 12000], couponRange: [30, 80], shop: "运动鞋靴", imageQuery: "running shoes" },

  // —— 虚拟商品：软件工具（高佣金、即时交付）——
  { title: "WPS Office超级会员Pro 年卡 PDF编辑+云文档", category: "软件工具", basePrice: 149, commissionRange: [25, 40], salesRange: [3000, 25000], ratingRange: [4.6, 4.9], reviewRange: [5000, 40000], couponRange: [20, 50], shop: "WPS官方旗舰店", imageQuery: "office software", isVirtual: true, deliveryType: "digital" },
  { title: "Adobe Creative Cloud 摄影计划 PS+LR 一年订阅", category: "软件工具", basePrice: 888, commissionRange: [12, 22], salesRange: [500, 4200], ratingRange: [4.7, 4.9], reviewRange: [800, 6500], couponRange: [80, 200], shop: "Adobe官方店", imageQuery: "design software", isVirtual: true, deliveryType: "digital" },
  { title: "JetBrains全家桶 IDE订阅 个人版年卡", category: "软件工具", basePrice: 1299, commissionRange: [15, 25], salesRange: [200, 1800], ratingRange: [4.8, 5.0], reviewRange: [300, 2800], couponRange: [100, 300], shop: "JetBrains官方", imageQuery: "developer ide", isVirtual: true, deliveryType: "digital" },
  { title: "福昕PDF编辑器高级版 永久授权 商务办公", category: "软件工具", basePrice: 399, commissionRange: [20, 35], salesRange: [800, 6500], ratingRange: [4.5, 4.8], reviewRange: [1200, 9500], couponRange: [50, 120], shop: "福昕软件旗舰店", imageQuery: "pdf editor", isVirtual: true, deliveryType: "digital" },
  { title: "XMind思维导图Pro 季卡 头脑风暴利器", category: "软件工具", basePrice: 89, commissionRange: [28, 42], salesRange: [1500, 12000], ratingRange: [4.6, 4.9], reviewRange: [2000, 16000], couponRange: [10, 30], shop: "XMind官方", imageQuery: "mind map software", isVirtual: true, deliveryType: "digital" },

  // —— 虚拟商品：SaaS 服务 ——
  { title: "阿里云盘SVIP年卡 6TB空间 极速传输", category: "SaaS服务", basePrice: 199, commissionRange: [22, 35], salesRange: [4000, 32000], ratingRange: [4.7, 4.9], reviewRange: [6000, 48000], couponRange: [20, 60], shop: "阿里云官方店", imageQuery: "cloud storage", isVirtual: true, deliveryType: "digital" },
  { title: "腾讯会议企业版 500方会议室 年订阅", category: "SaaS服务", basePrice: 1299, commissionRange: [15, 25], salesRange: [300, 2400], ratingRange: [4.6, 4.9], reviewRange: [500, 4200], couponRange: [100, 300], shop: "腾讯会议官方", imageQuery: "video conference", isVirtual: true, deliveryType: "digital" },
  { title: "飞书OKR+文档协作 企业版 年付", category: "SaaS服务", basePrice: 599, commissionRange: [18, 28], salesRange: [600, 4800], ratingRange: [4.5, 4.8], reviewRange: [800, 6200], couponRange: [50, 150], shop: "飞书官方旗舰店", imageQuery: "team collaboration", isVirtual: true, deliveryType: "digital" },
  { title: "Notion Plus个人版 年订阅 笔记知识库", category: "SaaS服务", basePrice: 288, commissionRange: [20, 32], salesRange: [1200, 9500], ratingRange: [4.7, 4.9], reviewRange: [1800, 14000], couponRange: [30, 80], shop: "Notion中国", imageQuery: "notes saas", isVirtual: true, deliveryType: "digital" },
  { title: "Figma专业版 年订阅 UI设计协作", category: "SaaS服务", basePrice: 540, commissionRange: [18, 30], salesRange: [800, 6200], ratingRange: [4.8, 5.0], reviewRange: [1200, 9800], couponRange: [50, 120], shop: "Figma官方", imageQuery: "ui design tool", isVirtual: true, deliveryType: "digital" },

  // —— 虚拟商品：会员点卡（高频高佣金）——
  { title: "京东PLUS会员年卡 京豆+免邮+专属价", category: "会员点卡", basePrice: 149, commissionRange: [30, 45], salesRange: [8000, 60000], ratingRange: [4.8, 5.0], reviewRange: [15000, 120000], couponRange: [20, 50], shop: "京东PLUS官方", imageQuery: "membership card", isVirtual: true, deliveryType: "digital" },
  { title: "淘宝88VIP年卡 优酷+虾米+饿了么", category: "会员点卡", basePrice: 88, commissionRange: [28, 42], salesRange: [10000, 80000], ratingRange: [4.7, 4.9], reviewRange: [20000, 150000], couponRange: [10, 30], shop: "天猫会员官方", imageQuery: "vip membership", isVirtual: true, deliveryType: "digital" },
  { title: "腾讯视频VIP会员年卡 4K蓝光+免广告", category: "会员点卡", basePrice: 178, commissionRange: [32, 48], salesRange: [12000, 95000], ratingRange: [4.6, 4.9], reviewRange: [25000, 180000], couponRange: [20, 60], shop: "腾讯视频官方", imageQuery: "video membership", isVirtual: true, deliveryType: "digital" },
  { title: "爱奇艺黄金会员年卡 全网剧集抢先看", category: "会员点卡", basePrice: 158, commissionRange: [30, 45], salesRange: [10000, 78000], ratingRange: [4.5, 4.8], reviewRange: [22000, 160000], couponRange: [20, 50], shop: "爱奇艺官方店", imageQuery: "streaming membership", isVirtual: true, deliveryType: "digital" },
  { title: "网易云音乐黑胶VIP年卡 无损音质+会员曲库", category: "会员点卡", basePrice: 128, commissionRange: [33, 50], salesRange: [9000, 70000], ratingRange: [4.7, 4.9], reviewRange: [18000, 140000], couponRange: [15, 40], shop: "网易云音乐官方", imageQuery: "music membership", isVirtual: true, deliveryType: "digital" },
  { title: "百度网盘超级会员年卡 5TB+极速下载", category: "会员点卡", basePrice: 263, commissionRange: [25, 38], salesRange: [6000, 48000], ratingRange: [4.5, 4.8], reviewRange: [12000, 95000], couponRange: [30, 80], shop: "百度网盘官方", imageQuery: "cloud membership", isVirtual: true, deliveryType: "digital" },

  // —— 虚拟商品：点卡充值 ——
  { title: "全国三网话费充值100元 即时到账", category: "点卡充值", basePrice: 100, commissionRange: [2, 5], salesRange: [30000, 200000], ratingRange: [4.8, 5.0], reviewRange: [50000, 400000], couponRange: [0, 3], shop: "话费充值中心", imageQuery: "phone recharge", isVirtual: true, deliveryType: "digital" },
  { title: "Steam钱包充值卡 200元 游戏充值", category: "点卡充值", basePrice: 200, commissionRange: [8, 15], salesRange: [5000, 38000], ratingRange: [4.7, 4.9], reviewRange: [9000, 72000], couponRange: [5, 20], shop: "游戏点卡专营", imageQuery: "steam card", isVirtual: true, deliveryType: "digital" },
  { title: "Q币充值100个 QQ钱包即时到账", category: "点卡充值", basePrice: 100, commissionRange: [10, 18], salesRange: [8000, 60000], ratingRange: [4.6, 4.9], reviewRange: [15000, 110000], couponRange: [5, 15], shop: "腾讯充值中心", imageQuery: "q coin", isVirtual: true, deliveryType: "digital" },
  { title: "京东E卡500元 自用送礼皆宜 不记名", category: "点卡充值", basePrice: 500, commissionRange: [6, 12], salesRange: [3000, 24000], ratingRange: [4.8, 5.0], reviewRange: [6000, 48000], couponRange: [10, 40], shop: "京东E卡官方", imageQuery: "gift card", isVirtual: true, deliveryType: "digital" },
  { title: "App Store充值卡200元 苹果ID充值", category: "点卡充值", basePrice: 200, commissionRange: [7, 13], salesRange: [4000, 32000], ratingRange: [4.7, 4.9], reviewRange: [8000, 62000], couponRange: [5, 20], shop: "苹果充值专营", imageQuery: "app store card", isVirtual: true, deliveryType: "digital" },
  { title: "中国移动流量包 30GB月包 全国通用", category: "点卡充值", basePrice: 30, commissionRange: [15, 25], salesRange: [15000, 110000], ratingRange: [4.6, 4.9], reviewRange: [25000, 190000], couponRange: [2, 8], shop: "流量充值中心", imageQuery: "data plan", isVirtual: true, deliveryType: "digital" },

  // —— 虚拟商品：在线课程 ——
  { title: "Python全栈开发实战课 0基础到就业", category: "在线课程", basePrice: 999, commissionRange: [25, 40], salesRange: [2000, 16000], ratingRange: [4.7, 4.9], reviewRange: [3500, 28000], couponRange: [100, 300], shop: "极客时间官方", imageQuery: "programming course", isVirtual: true, deliveryType: "digital" },
  { title: "Excel数据分析实战 商务办公必备", category: "在线课程", basePrice: 299, commissionRange: [28, 42], salesRange: [4000, 30000], ratingRange: [4.6, 4.9], reviewRange: [6000, 48000], couponRange: [30, 100], shop: "网易云课堂", imageQuery: "excel course", isVirtual: true, deliveryType: "digital" },
  { title: "UI/UX设计师就业班 Figma+作品集", category: "在线课程", basePrice: 1299, commissionRange: [20, 32], salesRange: [1200, 9500], ratingRange: [4.7, 4.9], reviewRange: [2000, 16000], couponRange: [150, 400], shop: "站酷高高手", imageQuery: "design course", isVirtual: true, deliveryType: "digital" },
  { title: "英语口语1对1外教课 52节课包", category: "在线课程", basePrice: 2080, commissionRange: [15, 25], salesRange: [800, 6500], ratingRange: [4.8, 5.0], reviewRange: [1500, 12000], couponRange: [200, 500], shop: "VIPKID官方", imageQuery: "language course", isVirtual: true, deliveryType: "digital" },

  // —— 虚拟商品：数字内容 ——
  { title: "Kindle电子书畅销榜合集 1000本精装", category: "数字内容", basePrice: 99, commissionRange: [30, 45], salesRange: [3000, 22000], ratingRange: [4.6, 4.9], reviewRange: [5000, 38000], couponRange: [10, 30], shop: "Kindle官方店", imageQuery: "ebook", isVirtual: true, deliveryType: "digital" },
  { title: "得到App听书年卡 365本精解读", category: "数字内容", basePrice: 365, commissionRange: [25, 38], salesRange: [2500, 19000], ratingRange: [4.7, 4.9], reviewRange: [4000, 32000], couponRange: [30, 80], shop: "得到官方旗舰店", imageQuery: "audiobook", isVirtual: true, deliveryType: "digital" },
  { title: "PPT模板大全10000套 商务汇报教育通用", category: "数字内容", basePrice: 69, commissionRange: [35, 50], salesRange: [6000, 45000], ratingRange: [4.5, 4.8], reviewRange: [10000, 78000], couponRange: [10, 25], shop: "办公素材站", imageQuery: "ppt template", isVirtual: true, deliveryType: "digital" },
  { title: "商用字体合集500款 设计师必备版权无忧", category: "数字内容", basePrice: 159, commissionRange: [28, 42], salesRange: [1800, 14000], ratingRange: [4.6, 4.9], reviewRange: [3000, 24000], couponRange: [20, 60], shop: "字体设计专营", imageQuery: "font design", isVirtual: true, deliveryType: "digital" },
  { title: "4K视频素材包200GB 短视频剪辑商用授权", category: "数字内容", basePrice: 299, commissionRange: [25, 38], salesRange: [1200, 9500], ratingRange: [4.7, 4.9], reviewRange: [2000, 16000], couponRange: [30, 80], shop: "视频素材库", imageQuery: "video footage", isVirtual: true, deliveryType: "digital" },
];

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInRange([min, max]: [number, number]): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

export function randInt([min, max]: [number, number]): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
