/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8y34cfrjh400xa5")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "acoffywp",
    "name": "theme",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8y34cfrjh400xa5")

  // remove
  collection.schema.removeField("acoffywp")

  return dao.saveCollection(collection)
})
