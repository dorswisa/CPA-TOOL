
// lost password - properties

jQuery(document).ready(function($){

    var $form_modal = $('.cd-user-modal'),
        $form_forgot_password = $form_modal.find('#cd-reset-password');

    $('.cd-reset-password').on('click', function(){
        $('.openSidebarMenu').prop('checked', false);
        $form_modal.addClass('is-visible');
        //show the selected form
        $form_forgot_password.addClass('is-selected');
    });

    //close modal
    $('.cd-close-form').on('click', function(event){
        $form_modal.removeClass('is-visible');
    });

    //close modal when clicking the esc keyboard button
    $(document).keyup(function(event){
        if(event.which=='27'){
            $form_modal.removeClass('is-visible');
        }
    });

    //hide or show password
    $('.hide-password').on('click', function(){
        var $this= $(this),
            $password_field = $this.prev().prev('input');

        ( 'password' === $password_field.attr('type') ) ? $password_field.attr('type', 'text') : $password_field.attr('type', 'password');
        ( '/css/visibility.png' === $this.children("img").attr('src') ) ? $this.children("img").attr('src','/css/invisible.png') : $this.children("img").attr('src','/css/visibility.png');
        //focus and move cursor to the end of input field
        $password_field.putCursorAtEnd();
    });


    $('#cd-login').ajaxForm({
        type: 'POST',
        url: '/login',
        success: function (responseText, status, xhr, $form) {
            if (status == 'success') window.location.href = '/';
        },
        error: function (e) {
            $('#alert-modal-title').html('Login Failure!');
            $('#alert-modal-body').html('Please check your ID and/or password.');
            $('#alert-modal').modal('show');
        }
    });

    $('#cd-signup').ajaxForm({
        type: 'POST',
        url: '/signup',
        success: function (responseText, status, xhr, $form) {
            if (status == 'success')
            {
                $('#alert-modal-title').html('Sign-up Success!');
                $('#alert-modal-body').html('Thanks for signing up with CPA. <br>In order to get started, you need to log in to your account.');
                $('#alert-modal').modal('show');
                setTimeout(function(){window.location.href = '/';}, 3000);
            }
        },
        error: function (e) {
            if (e.responseText == 'email-taken')
            {
                $('#alert-modal-title').html('Sign-up Failure!');
                $('#alert-modal-body').html('The email address has already been allocated to another user.');
                $('#alert-modal').modal('show');
            }
        }
    });

    $('#cd-reset-password').ajaxForm({
        type: 'POST',
        url: '/forget',
        success: function (responseText, status, xhr, $form) {
            if (status == 'success')
            {
                $('#alert-modal-title').html('Sending mail!');
                $('#alert-modal-body').html('A link to reset your password was emailed to you.');
                $('#alert-modal').modal('show');
                setTimeout(function(){window.location.href = '/';}, 3000);
            }
        },
        error: function (e) {
            if (e.responseText == 'account not found'){
                $('#alert-modal-title').html('Reset Failure!');
                $('#alert-modal-body').html('Not Match. Are you sure you typed it correctly?');
                $('#alert-modal').modal('show');
            }	else{
                $('#alert-modal-title').html('Reset Failure!');
                $('#alert-modal-body').html('Sorry. There was a problem, please try again later.');
                $('#alert-modal').modal('show');
            }
        }
    });

    $('#edit-password-form').ajaxForm({
        type: 'POST',
        url: '/editpassword',
        success: function (responseText, status, xhr, $form) {
            if (status == 'success'){
                $('#edit-password-modal .alert').attr('class', 'alert alert-success');
                $('#edit-password-modal .alert').html('Your password has been reset.')
                $('#edit-password-modal .alert').fadeIn(500)
                setTimeout(function(){window.location.href = '/';}, 3000);
            }
        },
        error: function (e) {
            $('#edit-password-modal .alert').attr('class', 'alert alert-danger');
            $('#edit-password-modal .alert').html('We are sorry something went wrong, please try again..');
            $('#edit-password-modal .alert').fadeIn(500)
        }
    });
});


//credits https://css-tricks.com/snippets/jquery/move-cursor-to-end-of-textarea-or-input/
jQuery.fn.putCursorAtEnd = function() {
    return this.each(function() {
        // If this function exists...
        if (this.setSelectionRange) {
            // ... then use it (Doesn't work in IE)
            // Double the length because Opera is inconsistent about whether a carriage return is one character or two. Sigh.
            var len = $(this).val().length * 2;
            this.setSelectionRange(len, len);
        } else {
            // ... otherwise replace the contents with itself
            // (Doesn't work in Google Chrome)
            $(this).val($(this).val());
        }
    });
};
