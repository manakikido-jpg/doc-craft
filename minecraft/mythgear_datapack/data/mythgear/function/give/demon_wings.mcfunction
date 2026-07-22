# 魔翼『ノクスウィング』
give @s minecraft:elytra[minecraft:item_name="魔翼『ノクスウィング』",minecraft:rarity="epic",minecraft:lore=["《八神装備・壱》","宵闇の魔女が背負う蝙蝠の翼。","身に着ければ夜空を滑空できる。"],minecraft:item_model="mythgear:demon_wings",minecraft:equippable={slot:"chest",asset_id:"mythgear:demon_wings",equip_sound:"minecraft:item.armor.equip_elytra"},minecraft:attribute_modifiers=[{id:"mythgear:demon_wings/armor",type:"minecraft:armor",amount:3,operation:"add_value",slot:"chest"}]]
tellraw @s [{"text":"[MythGear] ","color":"gold"},{"text":"魔翼『ノクスウィング』","color":"light_purple"},{"text":" を入手しました。","color":"gray"}]
