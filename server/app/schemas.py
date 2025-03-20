from marshmallow import Schema, fields, INCLUDE

class SummarizationSchema(Schema):
    summary = fields.Str(required=True)
    key_points = fields.List(fields.Str, required=True)
    tags = fields.List(fields.Str, required=True)

class ArticleSchema(Schema):
    class Meta:
        unknown = INCLUDE
        
    id = fields.Str(dump_only=True, attribute='_id')
    title = fields.Str(required=True)
    author = fields.Str()
    published_date = fields.DateTime()
    url = fields.Url(required=True)
    summarization = fields.Nested(SummarizationSchema)


article_schema = ArticleSchema()
