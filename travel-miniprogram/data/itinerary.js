const trip = {
  title: "我的旅行规划",
  date: "多目的地",
  subtitle: "旅行助手",
  days: [
    {
      id: "day-chimelong-0924",
      label: "长隆",
      date: "9月24日",
      title: "珠海长隆海洋王国",
      strategy: "先排演出和热门馆，刺激项目放在排队少的时段",
      groups: [
        {
          id: "chimelong-must",
          title: "必打卡",
          rating: 5,
          desc: "优先完成，适合围绕路线和演出时间安排。",
          items: [
            item("cl-whale-shark", "鲸鲨馆", "10:30–12:00", 5, "", "珠海长隆海洋王国"),
            item("cl-parrot-coaster", "鹦鹉过山车", "10:00–11:30", 5, "", "珠海长隆海洋王国"),
            item("cl-iceberg-coaster", "冰山过山车", "15:30–18:00", 5, "", "珠海长隆海洋王国"),
            item("cl-super-rapid", "超级激流", "15:30–18:00", 5, "", "珠海长隆海洋王国"),
            item("cl-beluga-theater", "白鲸剧场", "14:30 / 17:45", 5, "演出", "珠海长隆海洋王国"),
            item("cl-dolphin-theater", "海豚剧场", "13:30 / 17:00", 5, "演出", "珠海长隆海洋王国"),
            item("cl-penguin-house", "企鹅馆", "14:30–16:30", 5, "", "珠海长隆海洋王国"),
            item("cl-fireworks", "蔚蓝奇迹烟花秀", "20:00", 5, "晚间重点", "珠海长隆海洋王国"),
          ],
        },
        {
          id: "chimelong-recommended",
          title: "推荐",
          rating: 4,
          desc: "时间允许尽量安排，演出项目需要卡时间。",
          items: [
            item("cl-polar-bear", "北极熊馆", "15:00–17:30", 4, "", "珠海长隆海洋王国"),
            item("cl-beluga-house", "白鲸馆", "14:00–17:00", 4, "", "珠海长隆海洋王国"),
            item("cl-penguin-coaster", "企鹅过山车", "16:00–19:00", 4, "", "珠海长隆海洋王国"),
            item("cl-rainforest-tower", "雨林升降塔", "10:00–12:00", 4, "", "珠海长隆海洋王国"),
            item("cl-undersea-boat", "海底互动船", "10:30–14:00", 4, "", "珠海长隆海洋王国"),
            item("cl-sailboat", "激浪帆船", "15:00–18:30", 4, "", "珠海长隆海洋王国"),
            item("cl-castle-5d", "5D城堡影院·卡卡大冒险", "有空插入", 4, "", "珠海长隆海洋王国"),
            item("cl-manatee", "海牛馆", "10:00–12:00", 4, "", "珠海长隆海洋王国"),
            item("cl-dolphin-island", "海豚岛", "13:00–16:00", 4, "", "珠海长隆海洋王国"),
            item("cl-night-parade", "海洋夜光大巡游", "19:15", 4, "晚间重点", "珠海长隆海洋王国"),
            item("cl-flyboard", "水上飞人大汇演", "16:00", 4, "演出", "珠海长隆海洋王国"),
            item("cl-sea-lion-theater", "海狮剧场", "12:30 / 16:30", 4, "演出", "珠海长隆海洋王国"),
          ],
        },
        {
          id: "chimelong-optional",
          title: "有空补充",
          rating: 3,
          desc: "适合插空或排队少时加入。",
          items: [
            item("cl-sea-lion-bay", "海狮港湾", "12:00–16:00", 3, "", "珠海长隆海洋王国"),
            item("cl-sea-monster-tower", "海怪塔", "16:00–19:00", 3, "", "珠海长隆海洋王国"),
            item("cl-polar-cups", "极地转转杯", "14:00–17:00", 3, "", "珠海长隆海洋王国"),
            item("cl-water-battle", "旋转水战", "13:00–17:00", 3, "", "珠海长隆海洋王国"),
            item("cl-dolphin-car", "海豚转转车", "13:00–16:00", 3, "", "珠海长隆海洋王国"),
            item("cl-ray-pool", "鳐鱼池", "13:00–17:00", 3, "", "珠海长隆海洋王国"),
            item("cl-walrus-island", "海象岛", "16:00–18:00", 3, "", "珠海长隆海洋王国"),
            item("cl-otter-home", "水獭之家", "17:00–19:00", 3, "", "珠海长隆海洋王国"),
            item("cl-penguin-party", "企鹅奇趣狂欢派对", "15:00", 3, "演出", "珠海长隆海洋王国"),
          ],
        },
        {
          id: "chimelong-low-priority",
          title: "低优先级",
          rating: 2,
          desc: "路线经过或等待演出时再考虑。",
          items: [
            item("cl-bird-world", "海鸟世界", "16:00–18:00", 2, "", "珠海长隆海洋王国"),
            item("cl-bumper", "碰碰乐", "17:00–19:00", 2, "", "珠海长隆海洋王国"),
            item("cl-touch-pool", "触摸池", "13:00–17:00", 2, "", "珠海长隆海洋王国"),
            item("cl-jungle-climb", "丛林攀爬", "10:00–12:00", 2, "", "珠海长隆海洋王国"),
            item("cl-dream-ocean", "梦幻海洋", "17:00–19:00", 2, "", "珠海长隆海洋王国"),
            item("cl-mammoth-parade", "超级猛犸大巡游", "17:00", 2, "演出", "珠海长隆海洋王国"),
          ],
        },
        {
          id: "chimelong-backup",
          title: "备选",
          rating: 1,
          desc: "只有时间很充裕时考虑。",
          items: [item("cl-sand-castle", "沙雕城堡", "10:00–12:00", 1, "", "珠海长隆海洋王国")],
        },
      ],
    },
    {
      id: "day-disney",
      label: "港迪",
      date: "9月25日",
      title: "香港迪士尼乐园",
      strategy: "先玩热门项目，晚上预留城堡烟花和巡游时间",
      groups: [
        {
          id: "must",
          title: "必打卡",
          rating: 5,
          desc: "优先完成，适合围绕路线和演出时间安排。",
          items: [
            item("frozen-ever-after", "魔雪奇幻之旅", "10:00–11:30", 5),
            item("grizzly-mine-cars", "灰熊山极速矿车", "10:00–12:00 / 17:00后", 5),
            item("hyperspace-mountain", "星战极速穿梭", "10:00–12:00 / 17:00后", 5),
            item("mystic-manor", "迷离大宅", "11:00–16:00", 5),
            item("rc-racer", "冲天遥控车", "10:00–12:00 / 17:00后", 5),
            item("iron-man-experience", "铁甲奇侠飞行之旅", "10:00–12:00 / 16:00后", 5),
          ],
        },
        {
          id: "recommended",
          title: "推荐",
          rating: 4,
          desc: "时间允许尽量安排，适合穿插在核心项目之间。",
          items: [
            item("slinky-dog-spin", "雪岭滑雪橇", "10:00–12:00", 4),
            item("jungle-river-cruise", "森林河流之旅", "13:00–17:00", 4),
            item("toy-soldier-parachute", "玩具兵团跳降伞", "10:00–12:00 / 17:00后", 4),
            item("ant-man-wasp", "蚁侠与黄蜂女：击战特攻！", "13:00–17:00", 4),
            item("pooh-adventure", "小熊维尼历险之旅", "13:00–17:00", 4),
            item("small-world", "“小小世界”", "13:00–17:00", 4),
            item("mickey-philharmagic", "米奇幻想曲", "12:00–17:00", 4),
          ],
        },
        {
          id: "optional",
          title: "有空补充",
          rating: 3,
          desc: "适合插空或排队少时加入。",
          items: [
            item("mad-hatter-cups", "疯帽子旋转杯", "16:00–19:00", 3),
            item("slinky-dog", "转转弹弓狗", "16:00–19:00", 3),
            item("orbitron", "太空飞碟", "16:00–19:00", 3),
            item("dumbo", "小飞象旋转世界", "16:00–19:00", 3),
            item("carousel", "灰姑娘旋转木马", "16:00–19:00", 3),
            item("railroad-fantasyland", "香港迪士尼乐园铁路－幻想世界火车站", "下午", 3),
            item("railroad-main-street", "香港迪士尼乐园铁路－小镇大街火车站", "下午/傍晚", 3),
          ],
        },
        {
          id: "low-priority",
          title: "低优先级",
          rating: 2,
          desc: "路线经过或等待演出时再考虑。",
          items: [
            item("main-street-vehicles", "小镇大街古董车", "傍晚", 2),
            item("woodland-theatre", "森林小天地", "11:30–19:00", 2),
            item("castle", "奇妙梦想城堡", "路过即可", 2),
            item("fairy-tale-forest", "童话园林", "路过即可", 2),
            item("tarzan-treehouse", "泰山树屋", "有时间再去", 2),
            item("geyser-gulch", "喷泉山谷", "有时间再去", 2),
            item("water-play", "历奇喷水池", "有时间再去", 2),
            item("barrel-of-fun", "欢乐桶", "有时间再去", 2),
          ],
        },
        {
          id: "backup",
          title: "备选",
          rating: 1,
          desc: "只有时间很充裕时考虑。",
          items: [
            item("karibuni-marketplace", "加利布尼市集", "可跳过", 1),
            item("fantasy-gardens", "奇幻庭园", "可跳过", 1),
            item("mystic-point-freight", "迷离庄园货运站", "可跳过", 1),
            item("wild-west-photo", "西部拍拍照", "可跳过", 1),
          ],
        },
      ],
    },
    {
      id: "day-hongkong-city",
      label: "香港",
      date: "9月26日",
      title: "香港市区路线",
      strategy: "上午逛旺角街区，下午去铜锣湾和中环，傍晚坐天星小轮到尖沙咀。",
      groups: [
        {
          id: "hk-entry-mongkok",
          title: "入境与旺角",
          desc: "从酒店到皇岗口岸，过关后坐跨境巴士到旺角，再步行逛旺角街区。",
          items: [
            routeItem("hk-0800-huanggang", "前往皇岗口岸", "08:00", "酒店 → 皇岗口岸", {
              boardAt: "酒店",
              direction: "前往皇岗口岸",
              route: "酒店 → 皇岗口岸",
              getOffAt: "皇岗口岸",
            }),
            routeItem("hk-0900-mongkok", "前往旺角", "09:00", "皇岗口岸 → 皇岗—旺角跨境巴士 → 鸦兰街（金都商场对开）", {
              boardAt: "皇岗口岸",
              direction: "前往旺角方向",
              route: "皇岗口岸 → 皇岗—旺角跨境巴士 → 鸦兰街（金都商场对开）",
              getOffAt: "鸦兰街（金都商场对开）",
            }),
            routeItem("hk-0920-langham", "朗豪坊", "09:20–09:50", "步行前往朗豪坊", {
              boardAt: "鸦兰街（金都商场对开）",
              direction: "步行游览",
              route: "鸦兰街（金都商场对开） → 朗豪坊",
              getOffAt: "朗豪坊",
            }),
            routeItem("hk-0950-portland", "砵兰街", "09:50–10:30", "朗豪坊 → 步行 → 砵兰街", {
              boardAt: "朗豪坊",
              direction: "步行游览",
              route: "朗豪坊 → 砵兰街",
              getOffAt: "砵兰街",
            }),
            routeItem("hk-1030-ladies-market", "女人街", "10:30–11:00", "步行 → 通菜街（女人街）", {
              boardAt: "砵兰街",
              direction: "步行游览",
              route: "砵兰街 → 通菜街（女人街）",
              getOffAt: "通菜街（女人街）",
            }),
            routeItem("hk-1100-sneakers-street", "波鞋街", "11:00–11:30", "步行 → 花园街 / 波鞋街", {
              boardAt: "通菜街（女人街）",
              direction: "步行游览",
              route: "通菜街（女人街） → 花园街 / 波鞋街",
              getOffAt: "花园街 / 波鞋街",
            }),
            routeItem("hk-1130-goldfish-market", "金鱼街", "11:30–12:00", "步行 → 通菜街金鱼街一带", {
              boardAt: "花园街 / 波鞋街",
              direction: "步行游览",
              route: "花园街 / 波鞋街 → 通菜街金鱼街一带",
              getOffAt: "通菜街金鱼街一带",
            }),
          ],
        },
        {
          id: "hk-causeway-central",
          title: "铜锣湾与中环",
          desc: "从旺角坐港铁到铜锣湾，再前往中环街市、石板街、半山扶梯和大馆。",
          items: [
            routeItem("hk-1240-causeway-bay", "前往铜锣湾", "12:40", "旺角站 → 港铁荃湾线 → 金钟站 → 港铁港岛线 → 铜锣湾站", {
              boardAt: "旺角站",
              direction: "经金钟转乘，前往铜锣湾方向",
              route: "旺角站 → 港铁荃湾线 → 金钟站 → 港铁港岛线 → 铜锣湾站",
              getOffAt: "铜锣湾站",
            }),
            routeItem("hk-1315-causeway-bay", "铜锣湾逛街", "13:15–14:00", "时代广场 → 希慎广场 → 轩尼诗道", {
              boardAt: "铜锣湾站",
              direction: "步行游览",
              route: "时代广场 → 希慎广场 → 轩尼诗道",
              getOffAt: "轩尼诗道一带",
              remark: "主要拍照/逛街",
            }),
            routeItem("hk-1400-central", "前往中环", "14:00", "铜锣湾站 → 港铁港岛线 → 中环站", {
              boardAt: "铜锣湾站",
              direction: "港铁港岛线往中环方向",
              route: "铜锣湾站 → 港铁港岛线 → 中环站",
              getOffAt: "中环站",
            }),
            routeItem("hk-1415-central-market", "中环街市", "14:15–14:35", "中环站 → 步行", {
              boardAt: "中环站",
              direction: "步行游览",
              route: "中环站 → 中环街市",
              getOffAt: "中环街市",
            }),
            routeItem("hk-1435-pottinger", "砵典乍街", "14:35–15:00", "中环街市 → 步行 → 石板街", {
              boardAt: "中环街市",
              direction: "步行游览",
              route: "中环街市 → 砵典乍街（石板街）",
              getOffAt: "砵典乍街（石板街）",
            }),
            routeItem("hk-1500-escalator", "半山扶梯", "15:00–15:30", "步行 → 中环至半山自动扶梯", {
              boardAt: "砵典乍街（石板街）",
              direction: "步行前往半山扶梯",
              route: "砵典乍街（石板街） → 中环至半山自动扶梯",
              getOffAt: "中环至半山自动扶梯",
            }),
            routeItem("hk-1530-tai-kwun", "大馆", "15:30–16:10", "半山扶梯 → 步行 → 大馆", {
              boardAt: "中环至半山自动扶梯",
              direction: "步行前往大馆",
              route: "中环至半山自动扶梯 → 大馆",
              getOffAt: "大馆",
            }),
            routeItem("hk-1610-pier", "前往中环码头", "16:10–16:30", "大馆 → 步行下山 → 中环码头", {
              boardAt: "大馆",
              direction: "步行下山前往中环码头",
              route: "大馆 → 中环码头",
              getOffAt: "中环码头",
            }),
          ],
        },
        {
          id: "hk-harbour-route",
          title: "天星小轮与尖沙咀",
          desc: "从中环坐天星小轮到尖沙咀码头，再步行到香港钟楼。",
          items: [
            routeItem("hk-1630-star-ferry", "乘天星小轮", "16:30–17:00", "中环7号码头 → 天星小轮 → 尖沙咀码头", {
              boardAt: "中环7号码头",
              direction: "前往尖沙咀码头",
              route: "中环7号码头 → 天星小轮 → 尖沙咀码头",
              getOffAt: "尖沙咀码头",
            }),
            routeItem("hk-1700-clock-tower", "香港钟楼", "17:00–17:20", "尖沙咀码头 → 步行", {
              boardAt: "尖沙咀码头",
              direction: "步行游览",
              route: "尖沙咀码头 → 香港钟楼",
              getOffAt: "香港钟楼",
            }),
            routeItem("hk-1720-victoria-harbour", "星光大道 + 维港", "17:20–18:20", "香港钟楼 → 星光大道 → 维港海滨", {
              boardAt: "香港钟楼",
              direction: "步行游览",
              route: "香港钟楼 → 星光大道 → 维港海滨",
              getOffAt: "维港海滨",
              remark: "沿海滨一路走，拍照、休息",
            }),
            routeItem("hk-1820-central-back", "前往中环", "18:20", "尖沙咀站 → 港铁荃湾线 → 中环站", {
              boardAt: "尖沙咀站",
              direction: "港铁荃湾线往中环方向",
              route: "尖沙咀站 → 港铁荃湾线 → 中环站",
              getOffAt: "中环站",
            }),
          ],
        },
        {
          id: "hk-peak-return-route",
          title: "太平山顶与返程",
          desc: "从中环步行到山顶缆车总站，上太平山顶看夜景，再回尖沙咀坐永东巴士返深。",
          items: [
            routeItem("hk-1840-peak-tram-station", "前往山顶缆车总站", "18:40–19:00", "中环站 → 步行 → 花园道山顶缆车总站", {
              boardAt: "中环站",
              direction: "步行前往花园道",
              route: "中环站 → 花园道山顶缆车总站",
              getOffAt: "花园道山顶缆车总站",
            }),
            routeItem("hk-1900-peak-tram", "乘山顶缆车上山", "19:00–19:20", "山顶缆车 → 太平山顶站", {
              boardAt: "花园道山顶缆车总站",
              direction: "缆车上山",
              route: "山顶缆车 → 太平山顶站",
              getOffAt: "太平山顶站",
            }),
            routeItem("hk-1920-peak", "太平山顶夜景", "19:20–21:00", "凌霄阁 → 观景台 → 夜景", {
              boardAt: "太平山顶站",
              direction: "山顶观景",
              route: "凌霄阁 → 观景台 → 夜景",
              getOffAt: "太平山顶",
            }),
            routeItem("hk-2100-downhill", "乘15号巴士下山", "21:00", "山顶巴士总站 → 15号巴士 → 往中环（交易广场）方向", {
              boardAt: "山顶巴士总站",
              direction: "15号巴士往中环（交易广场）方向",
              route: "山顶巴士总站 → 15号巴士 → 交易广场",
              getOffAt: "交易广场",
            }),
            routeItem("hk-2130-exchange-square", "抵达交易广场", "约21:30", "15号巴士 → 交易广场", {
              boardAt: "15号巴士",
              direction: "抵达中环交易广场",
              route: "15号巴士 → 交易广场",
              getOffAt: "交易广场",
            }),
            routeItem("hk-2130-tsim-sha-tsui", "前往尖沙咀", "21:30", "中环站 → 港铁荃湾线 → 尖沙咀站", {
              boardAt: "中环站",
              direction: "港铁荃湾线往荃湾方向",
              route: "中环站 → 港铁荃湾线 → 尖沙咀站",
              getOffAt: "尖沙咀站",
            }),
            routeItem("hk-2200-china-hk-city", "步行到中港城", "22:00", "尖沙咀站 → 步行 → 中港城", {
              boardAt: "尖沙咀站",
              direction: "步行前往中港城",
              route: "尖沙咀站 → 中港城",
              getOffAt: "中港城",
            }),
            routeItem("hk-2230-shenzhen-bus", "永东巴士返深", "22:30左右", "永东巴士 → 深圳湾口岸", {
              boardAt: "中港城永东巴士点",
              direction: "前往深圳湾口岸",
              route: "永东巴士 → 深圳湾口岸",
              getOffAt: "深圳湾口岸",
            }),
            routeItem("hk-2330-hotel", "回酒店", "约23:30", "深圳湾过关 → 回酒店", {
              boardAt: "深圳湾口岸",
              direction: "过关后回酒店",
              route: "深圳湾过关 → 回酒店",
              getOffAt: "酒店",
            }),
          ],
        },
      ],
    },
    {
      id: "day-macau-0928",
      label: "澳门",
      date: "9月27日",
      title: "澳门一日路线",
      strategy: "上午逛历史城区，下午转氹仔，晚上按口岸返程",
      groups: [
        {
          id: "macau-entry-history",
          title: "入境与历史城区",
          desc: "从拱北口岸过关到澳门关闸，再前往大三巴、恋爱巷、大炮台和议事亭前地。",
          items: [
            routeItem("mo-0900-border", "拱北口岸过关", "09:00", "拱北口岸过关 → 澳门关闸", {
              boardAt: "拱北口岸（珠海侧）",
              direction: "过关前往澳门",
              route: "拱北口岸过关 → 澳门关闸",
              getOffAt: "澳门关闸",
            }),
            routeItem("mo-0930-ruins-bus", "前往大三巴", "09:30", "关闸总站 M1 → 17路 → 往白鸽巢方向 → 新胜街下车", {
              boardAt: "关闸总站 M1",
              direction: "往白鸽巢方向",
              route: "关闸总站 M1 → 17路 → 新胜街",
              getOffAt: "新胜街临时站",
              remark: "9/8–9/30 新胜街施工，使用原站前方约40米的临时站",
            }),
            routeItem("mo-0940-ruins-walk", "大三巴牌坊游览", "09:40–11:30", "步行：大三巴 → 恋爱巷 → 大炮台 → 议事亭前地", {
              boardAt: "新胜街临时站",
              direction: "步行游览",
              route: "大三巴 → 恋爱巷 → 大炮台 → 议事亭前地",
              getOffAt: "议事亭前地",
            }),
          ],
        },
        {
          id: "macau-tower-route",
          title: "新葡京、美高梅与旅游塔",
          desc: "从历史城区步行到新葡京、美高梅，再坐 11 路前往澳门旅游塔。",
          items: [
            routeItem("mo-1130-grand-lisboa", "前往新葡京", "11:30–12:00", "议事亭前地 → 步行 → 新葡京", {
              boardAt: "议事亭前地",
              direction: "步行前往新葡京",
              route: "议事亭前地 → 新葡京",
              getOffAt: "新葡京",
            }),
            routeItem("mo-1300-mgm", "前往美高梅澳门", "13:00–13:40", "新葡京 → 步行 → 美高梅", {
              boardAt: "新葡京",
              direction: "步行前往美高梅",
              route: "新葡京 → 美高梅澳门",
              getOffAt: "美高梅澳门",
            }),
            routeItem("mo-1340-tower-bus", "前往澳门旅游塔", "13:40", "美高梅附近 → 11路 → 澳门旅游塔附近", {
              boardAt: "西湾湖景大马路/妈阁码头 M198",
              direction: "11路往氹仔官也街方向",
              route: "美高梅附近 → 区华利前地一带 → 11路 → 澳门旅游塔附近",
              getOffAt: "澳门旅游塔附近",
              remark: "从美高梅附近步行至「区华利前地」一带，再到 M198 站上车",
            }),
            routeItem("mo-1400-tower", "澳门旅游塔观景", "14:00–15:00", "看澳门全景", {
              boardAt: "澳门旅游塔附近",
              direction: "游览",
              route: "澳门旅游塔观景",
              getOffAt: "澳门旅游塔",
            }),
          ],
        },
        {
          id: "macau-taipa-route",
          title: "官也街与威尼斯人",
          desc: "从旅游塔到官也街，再坐 15 路到威尼斯人。",
          items: [
            routeItem("mo-1500-cunha-bus", "前往官也街", "15:00", "西湾湖景大马路/妈阁码头 M198 → 11路 → T320「氹仔官也街」", {
              boardAt: "西湾湖景大马路/妈阁码头 M198",
              direction: "11路往氹仔官也街方向",
              route: "西湾湖景大马路/妈阁码头 M198 → 11路 → T320 氹仔官也街",
              getOffAt: "T320 氹仔官也街",
              remark: "从旅游塔步行至西湾湖景大马路/妈阁码头 M198 上车",
            }),
            routeItem("mo-1545-cunha", "官也街逛吃", "15:45–17:00", "官也街", {
              boardAt: "T320 氹仔官也街",
              direction: "步行游览",
              route: "官也街逛吃休息",
              getOffAt: "官也街",
              remark: "吃东西、逛街、休息",
            }),
            routeItem("mo-1700-venetian-bus", "前往威尼斯人", "17:00", "T320「氹仔官也街」→ 15路 → 往九澳油库方向 → T363「连贯公路/威尼斯人」下车", {
              boardAt: "T320 氹仔官也街",
              direction: "15路往九澳油库方向",
              route: "T320 氹仔官也街 → 15路 → T363 连贯公路/威尼斯人",
              getOffAt: "T363 连贯公路/威尼斯人",
            }),
            routeItem("mo-1720-venetian", "威尼斯人游览", "17:20–18:20", "威尼斯人大运河 → 穹顶 → 建筑", {
              boardAt: "T363 连贯公路/威尼斯人",
              direction: "步行游览",
              route: "威尼斯人大运河 → 穹顶 → 建筑",
              getOffAt: "威尼斯人",
              remark: "看大运河、穹顶、建筑，不坐船",
            }),
          ],
        },
        {
          id: "macau-cotai-return",
          title: "巴黎人、伦敦人与返程",
          desc: "步行串联巴黎人和伦敦人，再坐 25 路返回关闸，经拱北口岸回珠海。",
          items: [
            routeItem("mo-1820-parisian", "前往巴黎人", "18:20–18:50", "威尼斯人 → 步行 → 巴黎人", {
              boardAt: "威尼斯人",
              direction: "步行前往巴黎人",
              route: "威尼斯人 → 巴黎人",
              getOffAt: "巴黎人",
            }),
            routeItem("mo-1850-londoner", "前往伦敦人", "18:50–19:40", "巴黎人 → 步行 → 伦敦人", {
              boardAt: "巴黎人",
              direction: "步行前往伦敦人",
              route: "巴黎人 → 伦敦人",
              getOffAt: "伦敦人",
            }),
            routeItem("mo-1940-night", "伦敦人夜景", "19:40–20:00", "看夜景", {
              boardAt: "伦敦人",
              direction: "观景",
              route: "伦敦人夜景",
              getOffAt: "伦敦人",
            }),
            routeItem("mo-2000-border-bus", "乘25路返回关闸", "20:00", "T380「连贯公路/伦敦人」→ 25路 → 往关闸方向 → M9「关闸广场」下车", {
              boardAt: "T380 连贯公路/伦敦人",
              direction: "25路往关闸方向",
              route: "T380 连贯公路/伦敦人 → 25路 → M9 关闸广场",
              getOffAt: "M9 关闸广场",
            }),
            routeItem("mo-2100-border", "澳门关闸过关返珠海", "约21:00", "关闸广场 → 澳门关闸 → 拱北口岸 → 回珠海", {
              boardAt: "M9 关闸广场",
              direction: "步行过关回珠海",
              route: "关闸广场 → 澳门关闸 → 拱北口岸",
              getOffAt: "拱北口岸（珠海侧）",
            }),
          ],
        },
      ],
    },
  ],
};

function item(id, title, time, stars, tag = "", park = "香港迪士尼乐园") {
  return {
    id,
    title,
    time,
    stars,
    heartIcons: Array.from({ length: 5 }, (_, index) => ({
      id: index,
      filled: index < stars,
    })),
    tag,
    showTransport: false,
    location: `${park}内，具体位置待补充`,
    transport: {
      boardAt: "待补充：从哪个位置/站点出发",
      direction: "待补充：乘坐方向",
      route: "待补充：从哪一站到哪一站",
      getOffAt: "待补充：目的地下车点",
    },
    note: "项目名称以官网当前项目列表为准。",
  };
}

function routeItem(id, title, time, route, transport) {
  return {
    id,
    title,
    time,
    timeLabel: "时间",
    stars: 0,
    heartIcons: [],
    tag: "",
    showTransport: true,
    location: title,
    transport: normalizeTransport(transport),
    note: route,
  };
}

function normalizeTransport(transport) {
  const result = { ...transport };
  const route = result.route || "";
  const direction = result.direction || "";

  if (!result.mode) {
    if (route.includes("港铁") || route.includes("MTR")) {
      result.mode = "港铁";
    } else if (route.includes("跨境巴士")) {
      result.mode = "跨境巴士";
    } else if (route.includes("15号巴士")) {
      result.mode = "15号巴士";
    } else if (route.match(/\d+路/)) {
      result.mode = route.match(/\d+路/)[0];
    } else if (route.includes("永东巴士")) {
      result.mode = "永东巴士";
    } else if (route.includes("天星小轮")) {
      result.mode = "天星小轮";
    } else if (route.includes("山顶缆车")) {
      result.mode = "山顶缆车";
    } else if (route.includes("步行") || direction.includes("步行")) {
      result.mode = "步行";
    } else if (direction.includes("过关")) {
      result.mode = "过关";
    } else if (direction.includes("观景")) {
      result.mode = "观景";
    }
  }

  if (result.direction && result.mode === "步行") {
    result.direction = "";
  }
  if (result.direction && result.mode === "观景") {
    result.direction = "";
  }
  if (result.direction && result.mode === "过关") {
    result.direction = "";
  }
  if (result.direction && result.mode === "山顶缆车" && result.direction.includes("上山")) {
    result.direction = "上山";
  }
  if (result.direction && result.mode === "港铁") {
    const match = result.direction.match(/往(.+?)方向/);
    result.direction = match ? `往${match[1]}方向` : result.direction;
  }

  if (result.mode === "港铁") {
    const lineNames = [
      ...new Set(
        [...result.route.matchAll(/港铁[^→｜|]*线|[^→｜|]+线/g)].map((match) =>
          match[0].replace(/^港铁/, "").trim()
        )
      ),
    ];
    result.transportType = "地铁";
    result.lineName = lineNames.length ? lineNames.join(" → ") : "港铁";
  } else if (result.mode && /(\d+路|巴士)/.test(result.mode)) {
    result.transportType = "公交";
    result.lineName = result.mode;
  } else if (result.mode === "天星小轮") {
    result.transportType = "轮渡";
    result.lineName = "天星小轮";
  } else if (result.mode === "山顶缆车") {
    result.transportType = "缆车";
    result.lineName = "山顶缆车";
  } else if (result.mode) {
    result.transportType = result.mode;
  }

  if (result.boardAt && result.getOffAt) {
    result.directionText = result.direction
      ? `${result.boardAt} → ${result.getOffAt}（${result.direction}）`
      : `${result.boardAt} → ${result.getOffAt}`;
  }

  const needsVehicleDetail = ["地铁", "公交", "轮渡", "缆车"].includes(result.transportType);
  const isSimpleRest = ["午餐休息", "就近用餐"].includes(result.direction);
  result.showDetail =
    Boolean(result.boardAt && result.getOffAt) &&
    !isSimpleRest &&
    result.mode !== "过关" &&
    result.mode !== "观景";
  result.showTraffic = needsVehicleDetail || result.mode === "步行";
  result.showLine = needsVehicleDetail && Boolean(result.lineName);
  result.showDirection = needsVehicleDetail && Boolean(result.directionText);

  if (result.route) {
    if (result.mode === "港铁") {
      result.routeText = result.lineName
        ? `${result.lineName}：${result.boardAt} → ${result.getOffAt}`
        : `${result.boardAt} → ${result.getOffAt}`;
    } else {
      result.routeText = result.route;
    }
  }

  return result;
}

module.exports = trip;
