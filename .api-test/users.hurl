#
# Must not allow not authorized users
#
GET {{URL}}/users

HTTP/* *

[Asserts]
status == 403

#
# Create a demo user (ignore an error that user exists, just for the sake of test)
#
POST {{URL}}/signup
{
    "username": "demo@nowhere.local",
    "password": "demo"
}
HTTP/* *

POST {{URL}}/signup
{
    "username": "demo2@nowhere.local",
    "password": "demo"
}
HTTP/* *

#
# Login to get a token
#
POST {{URL}}/login
{
    "username": "demo@nowhere.local",
    "password": "demo"
}
HTTP/* *
[Asserts]
status == 200
jsonpath "$.result.session.token" != null
[Captures]
TOKEN: jsonpath "$.result.session.token"

GET {{URL}}/users?q=AND+username%3Fdemo2
Authorization: Bearer {{TOKEN}}
HTTP/* *

#[Asserts]
#status == 200