// 全20種類のマスターカードデータ定義
const MASTER_CARDS = [
    // N (8枚)
    { id: 1, name: "ひよこっこ", rarity: "N", icon: "🐥", power: 30 },
    { id: 2, name: "のらねこ", rarity: "N", icon: "🐱", power: 35 },
    { id: 3, name: "しばいぬ", rarity: "N", icon: "🐕", power: 40 },
    { id: 4, name: "うさぎさん", rarity: "N", icon: "🐰", power: 45 },
    { id: 5, name: "かえるどん", rarity: "N", icon: "🐸", power: 50 },
    { id: 6, name: "はむすたー", rarity: "N", icon: "🐹", power: 55 },
    { id: 7, name: "ぽにー", rarity: "N", icon: "🐴", power: 60 },
    { id: 8, name: "ぶたさん", rarity: "N", icon: "🐷", power: 65 },
    
    // R (5枚)
    { id: 9, name: "おたずね狐", rarity: "R", icon: "🦊", power: 75 },
    { id: 10, name: "ぺんぎん丸", rarity: "R", icon: "🐧", power: 80 },
    { id: 11, name: "さめ将軍", rarity: "R", icon: "🦈", power: 85 },
    { id: 12, name: "ふくろう仙人", rarity: "R", icon: "🦉", power: 90 },
    { id: 13, name: "ぶらっくへび", rarity: "R", icon: "🐍", power: 95 },
    
    // SR (4枚)
    { id: 14, name: "森のくまさん", rarity: "SR", icon: "🐻", power: 110 },
    { id: 15, name: "百獣の王", rarity: "SR", icon: "🦁", power: 120 },
    { id: 16, name: "天空のワシ", rarity: "SR", icon: "🦅", power: 130 },
    { id: 17, name: "鎧武者ロボ", rarity: "SR", icon: "🤖", power: 140 },
    
    // UR (2枚)
    { id: 18, name: "炎のドラゴン", rarity: "UR", icon: "🐉", power: 165 },
    { id: 19, name: "雷光ユニコーン", rarity: "UR", icon: "🦄", power: 175 },
    
    // SEC (1枚)
    { id: 20, name: "黄金ナイト", rarity: "SEC", icon: "⚔️", power: 200 }
];

// 所持カードの取得（未所持の場合は 0枚スタート `[]` で統一）
function getPlayerCollection() {
    let raw = localStorage.getItem('playerCollection');
    if (raw === null) {
        localStorage.setItem('playerCollection', '[]');
        return [];
    }
    return JSON.parse(raw);
}