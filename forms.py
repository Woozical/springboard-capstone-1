from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, PasswordField
from wtforms.validators import InputRequired, Length

class NewRepoForm(FlaskForm):
    title = StringField('Title', validators=[Length(max=100, message="Maximum of 100 characters.")])
    description = StringField('Description', validators=[Length(max=300, message="Maximum of 300 characters.")])
    pass_phrase = PasswordField('Password', validators=[InputRequired(), Length(min=3, message='Minimum of 3 characters required.')])
    is_private = BooleanField('Private')

    def errors_to_json(self):
        errors = {}
        for field in self.errors:
            errors[field] = self.errors[field]
        
        return errors

class AuthRepoForm(FlaskForm):
    pass_phrase = PasswordField('Please enter the repository\'s password.', validators=[InputRequired()])