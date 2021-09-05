from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, PasswordField, HiddenField
from wtforms.validators import InputRequired

class NewRepoForm(FlaskForm):
    title = StringField('Title')
    description = StringField('Description')
    pass_phrase = StringField('Pass Phrase', validators=[InputRequired()])
    is_private = BooleanField('Private Repo')

class AuthRepoForm(FlaskForm):
    pass_phrase = PasswordField('Please enter the pass phrase', validators=[InputRequired()])