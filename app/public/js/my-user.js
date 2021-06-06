
jQuery(document).ready(function($) {

    $('#btn-delete').click(function () {
        $('#delete-modal-title').html('Warning!');
        $('#delete-modal-body').html('Are you sure you want to delete your account?.');
        $('#delete-modal').modal('show');
    });

    $('#delete-access').click(function () {
        $('#delete-modal').modal('hide');
        $.ajax({
            url: '/delete',
            type: 'POST',
            success: function(data){
                $('#alert-modal-title').html('Delete Successful!');
                $('#alert-modal-body').html('Your account has been deleted.<br>Redirecting you back to the homepage.');
                $('#alert-modal').modal('show');
                setTimeout(function () {
                    window.location.href = '/';
                }, 3000);
            },
            error: function(jqXHR){
                console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
            }
        });
    });

    $('#btn-logout').click(function () {
        $.ajax({
            url: '/logout',
            type: 'POST',
            data: {logout: true},
            xhrFields: {
                withCredentials: true
            },
            success: function (data) {
                $('#alert-modal-title').html('Log-Out Successful!');
                $('#alert-modal-body').html('Redirecting you back to the homepage.');
                $('#alert-modal').modal('show');
                setTimeout(function () {
                    window.location.href = '/';
                }, 3000);
            },
            error: function (jqXHR) {
                console.log(jqXHR.responseText + ' :: ' + jqXHR.statusText);
            }
        });
    });

    $('#edit-user-form').ajaxForm({
        type: 'POST',
        url: '/my-user',
        success: function (responseText, status, xhr, $form) {
            if (status == 'success'){
                $('#alert-modal-title').html('Edit Successful!');
                $('#alert-modal-body').html('Your account has been edited.. <br>Redirecting you back to the homepage.');
                $('#alert-modal').modal('show');
                setTimeout(function(){window.location.href = '/';}, 3000);
            }
        },
        error: function (e) {
            $('#alert-modal-title').html('Edit Failure!');
            $('#alert-modal-body').html('Your information has already been allocated to another user.');
            $('#alert-modal').modal('show');
        }
    });

//hide or show password
    $('.hide-password').on('click', function () {
        var $this = $(this),
            $password_field = $this.prev().prev('input');

        ('password' === $password_field.attr('type')) ? $password_field.attr('type', 'text') : $password_field.attr('type', 'password');
        ('/css/visibility.png' === $this.children("img").attr('src')) ? $this.children("img").attr('src', '/css/invisible.png') : $this.children("img").attr('src', '/css/visibility.png');
        //focus and move cursor to the end of input field
        $password_field.putCursorAtEnd();
    });


    jQuery.fn.putCursorAtEnd = function () {
        return this.each(function () {
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
});