from marshmallow import Schema, fields, INCLUDE, EXCLUDE, validate

class SummarizationSchema(Schema):
    summary = fields.Str(required=True)
    key_points = fields.List(fields.Str, required=True)
    tags = fields.List(fields.Str, required=True)

class ArticleSchema(Schema):
    class Meta:
        unknown = INCLUDE
        
    id = fields.Str(dump_only=True, attribute='_id')
    title = fields.Str(required=True)
    author = fields.Str(allow_none=True, missing="No Author")
    published_date = fields.DateTime()
    url = fields.Url(required=True)
    img = fields.Url(allow_none=True, missing="None")
    summarization = fields.Nested(SummarizationSchema)

class UserSchema(Schema):
    class Meta:
        unknown = EXCLUDE
    username = fields.Str(required=True, validate=validate.Length(min=3))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    role = fields.Str(missing="user")
    likes = fields.List(fields.Str, missing=list)

article_schema = ArticleSchema()
user_schema = UserSchema()