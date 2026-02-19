/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "8y34cfrjh400xa5",
    "created": "2026-02-14 07:33:32.959Z",
    "updated": "2026-02-14 07:33:32.959Z",
    "name": "markups",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ikwntsw9",
        "name": "book_id",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "ujnsu9iw",
        "name": "cfi_range",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "tvjzrq5v",
        "name": "type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "highlight",
            "underline",
            "wavy"
          ]
        }
      },
      {
        "system": false,
        "id": "3h3ijp80",
        "name": "text_excerpt",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("8y34cfrjh400xa5");

  return dao.deleteCollection(collection);
})
