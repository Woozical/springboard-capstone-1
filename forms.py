from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, PasswordField
from wtforms.validators import InputRequired, Length

class NewRepoForm(FlaskForm):
    title = StringField('Title')
    description = StringField('Description')
    pass_phrase = StringField('Pass Phrase', validators=[InputRequired(), Length(min=3, message='Minimum of 3 characters required.')])
    is_private = BooleanField('Private Repo')

class AuthRepoForm(FlaskForm):
    pass_phrase = PasswordField('Please enter the pass phrase', validators=[InputRequired()])