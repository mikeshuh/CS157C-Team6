from marshmallow import Schema, fields, INCLUDE

class ArticleSchema(Schema):
    class Meta:
        unknown = INCLUDE
        
    id = fields.Str(dump_only=True, attribute='_id')
    title = fields.Str(required=True)
    summary = fields.Str(required=True)

article_schema = ArticleSchema()
