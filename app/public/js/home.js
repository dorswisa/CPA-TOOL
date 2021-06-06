
var user;
function getValue(data) {
    user = data;
}

var globalgrid;
var filesel = [];
var deletefile;
var sendfile;


/**
 * Movies Grid Properties
 */

function throttle(fn, delay) {
    var allowSample = true;

    return function(e) {
        if (allowSample) {
            allowSample = false;
            setTimeout(function() { allowSample = true; }, delay);
            fn(e);
        }
    };
}

function nextSibling(el) {
    var nextSibling = el.nextSibling;
    while(nextSibling && nextSibling.nodeType != 1) {
        nextSibling = nextSibling.nextSibling
    }
    return nextSibling;
}

function extend( a, b ) {
    for( var key in b ) {
        if( b.hasOwnProperty( key ) ) {
            a[key] = b[key];
        }
    }
    return a;
}

;(function(window) {

    'use strict';

    var support = { transitions: Modernizr.csstransitions },
        // transition end event name
        transEndEventNames = { 'WebkitTransition': 'webkitTransitionEnd', 'MozTransition': 'transitionend', 'OTransition': 'oTransitionEnd', 'msTransition': 'MSTransitionEnd', 'transition': 'transitionend' },
        transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
        onEndTransition = function( el, callback ) {
            var onEndCallbackFn = function( ev ) {
                if( support.transitions ) {
                    if( ev.target != this ) return;
                    this.removeEventListener( transEndEventName, onEndCallbackFn );
                }
                if( callback && typeof callback === 'function' ) { callback.call(this); }
            };
            if( support.transitions ) {
                el.addEventListener( transEndEventName, onEndCallbackFn );
            }
            else {
                onEndCallbackFn();
            }
        };

    /**
     * some helper functions
     */

    /**
     * GridFx obj
     */
    function GridFx(el, options) {
        this.gridEl = el;
        this.options = extend( {}, this.options );
        extend( this.options, options );

        this.items = [].slice.call(this.gridEl.querySelectorAll('.grid__item'));
        this.previewEl = nextSibling(this.gridEl);
        this.isExpanded = false;
        this.isAnimating = false;
        this.closeCtrl = this.previewEl.querySelector('button.action--close');
        this.previewDescriptionEl = this.previewEl.querySelector('.description--preview');
        this.previewbackgroundEL = this.previewEl.querySelector('.background-movie');

        this._init();
    }

    /**
     * options
     */
    GridFx.prototype.options = {
        pagemargin : 0,
        // x and y can have values from 0 to 1 (percentage). If negative then it means the alignment is left and/or top rather than right and/or bottom
        // so, as an example, if we want our large image to be positioned vertically on 25% of the screen and centered horizontally the values would be x:1,y:-0.25
        imgPosition : { x : 1, y : 1 },
        onInit : function(instance) { return false; },
        onResize : function(instance) { return false; },
        onOpenItem : function(instance, item) { return false; },
        onCloseItem : function(instance, item) { return false; },
        onExpand : function() { return false; }
    }

    GridFx.prototype._init = function() {
        // callback
        this.options.onInit(this);

        var self = this;
        // init masonry after all images are loaded
        imagesLoaded( this.gridEl, function() {
            // initialize masonry
            new Masonry(self.gridEl, {
                itemSelector: '.grid__item',
                isFitWidth : true
            });
            // show grid after all images (thumbs) are loaded
            classie.add(self.gridEl, 'grid--loaded');
            // init/bind events
            self._initEvents();
            // create the large image and append it to the DOM
            self._setOriginal();
            // create the clone image and append it to the DOM
            self._setClone();

        });
    };

    /**
     * initialize/bind events
     */
    GridFx.prototype._initEvents = function () {
        var self = this,
            clickEvent = (document.ontouchstart!==null ? 'click' : 'touchstart');

        this.items.forEach(function(item) {
            var touchend = function(ev) {
                    ev.preventDefault();
                    self._openItem(ev, item);
                    item.removeEventListener('touchend', touchend);
                },
                touchmove = function(ev) {
                    item.removeEventListener('touchend', touchend);
                },
                manageTouch = function() {
                    item.addEventListener('touchend', touchend);
                    item.addEventListener('touchmove', touchmove);
                };

            item.addEventListener(clickEvent, function(ev) {
                if(clickEvent === 'click') {
                    ev.preventDefault();
                    self._openItem(ev, item);
                }
                else {
                    manageTouch();
                }
            });
        });

        // close expanded image
        this.closeCtrl.addEventListener('click', function() {
            self._closeItem();
        });

        window.addEventListener('resize', throttle(function(ev) {
            // callback
            self.options.onResize(self);
        }, 10));
    }

    /**
     * open a grid item
     */
    GridFx.prototype._openItem = function(ev, item) {
        if( this.isAnimating || this.isExpanded ) return;
        this.isAnimating = true;
        this.isExpanded = true;

        //$('.banner').css('display','none');

        // item's image
        var gridImg = item.querySelector('.real-img'),
            gridImgOffset = gridImg.getBoundingClientRect();

        item.querySelector('.real-img')

        // index of current item
        this.current = this.items.indexOf(item);

        // set the src of the original image element (large image)
        this._setOriginal(item.querySelector('.img-wrap').getAttribute('href'));

        // callback
        //this.options.onOpenItem(this, item);

        // set the clone image
        this._setClone(gridImg.src, {
            width : gridImg.offsetWidth,
            height : gridImg.offsetHeight,
            left : gridImgOffset.left,
            top : gridImgOffset.top
        });

        // hide original grid item
        classie.add(item, 'grid__item--current');

        // calculate the transform value for the clone to animate to the full image view
        var win = this._getWinSize(),
            originalSizeArr = item.getAttribute('data-size').split('x'),
            originalSize = {width: originalSizeArr[0], height: originalSizeArr[1]},
            dx = ((this.options.imgPosition.x > 0 ? 1-Math.abs(this.options.imgPosition.x) : Math.abs(this.options.imgPosition.x)) * win.width + this.options.imgPosition.x * win.width/2) - gridImgOffset.left - 0.5 * gridImg.offsetWidth,
            dy = ((this.options.imgPosition.y > 0 ? 1-Math.abs(this.options.imgPosition.y) : Math.abs(this.options.imgPosition.y)) * win.height + this.options.imgPosition.y * win.height/2) - gridImgOffset.top - 0.5 * gridImg.offsetHeight,
            z = Math.min( Math.min(win.width*Math.abs(this.options.imgPosition.x) - this.options.pagemargin, originalSize.width - this.options.pagemargin)/gridImg.offsetWidth, Math.min(win.height*Math.abs(this.options.imgPosition.y) - this.options.pagemargin, originalSize.height - this.options.pagemargin)/gridImg.offsetHeight );

        // apply transform to the clone
        this.cloneImg.style.WebkitTransform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';
        this.cloneImg.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';


        // add the description if any
        var descriptionEl = item.querySelector('.description');
        if( descriptionEl ) {
            this.previewDescriptionEl.innerHTML = descriptionEl.innerHTML;
        }

        var dltbtn = this.previewEl.querySelector('.deletebtn');
        $(dltbtn).on('click', function(e) {
            $('#delete-modal-title').html('Warning!');
            $('#delete-modal-body').html('Are you sure you want to delete this file?.');
            $('#delete-modal').modal('show');
            deletefile = dltbtn.getAttribute('value').replaceAll("%20", " ");
        });

        var sndbtn = this.previewEl.querySelector('.sendbtn');
        $(sndbtn).on('click', function(e) {
            $('#send-modal-title').html('Pay Attention!');
            $('#send-modal-body').html('Are you sure you want to send this file?.');
            $('#send-modal').modal('show');
            sendfile = dltbtn.getAttribute('value').replaceAll("%20", " ");
        });


        var self = this;
        setTimeout(function() {
            // controls the elements inside the expanded view
            classie.add(self.previewEl, 'preview--open');
            // callback
            self.options.onExpand();
        }, 0);

        // after the clone animates..
        onEndTransition(this.cloneImg, function() {
            // when the original/large image is loaded..
            imagesLoaded(self.originalImg, function() {
                // close button just gets shown after the large image gets loaded
                classie.add(self.previewEl, 'preview--image-loaded');
                // animate the opacity to 1
                self.originalImg.style.opacity = 1;
                // and once that's done..
                onEndTransition(self.originalImg, function() {
                    // reset cloneImg
                    self.cloneImg.style.opacity = 0;
                    self.cloneImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
                    self.cloneImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';

                    self.isAnimating = false;
                });

            });
        });
    };

    /**
     * create/set the original/large image element
     */
    GridFx.prototype._setOriginal = function(src) {
        if( !src ) {
            this.originalImg = document.createElement('img');
            this.originalImg.className = 'original';
            this.originalImg.style.opacity = 0;
            this.originalImg.style.maxWidth = 'calc(' + parseInt(Math.abs(this.options.imgPosition.x)*100) + 'vw - ' + this.options.pagemargin + 'px)';
            this.originalImg.style.maxHeight = 'calc(' + parseInt(Math.abs(this.options.imgPosition.y)*100) + 'vh - ' + this.options.pagemargin + 'px)';
            this.originalImg.style.position = 'absolute';
            this.originalImg.style.float = 'left';
            // need it because of firefox
            this.originalImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
            this.originalImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';
            src = '';
            this.previewEl.appendChild(this.originalImg);
        }

        this.originalImg.setAttribute('src', src);
    };

    /**
     * create/set the clone image element
     */
    GridFx.prototype._setClone = function(src, settings) {
        if( !src ) {
            this.cloneImg = document.createElement('img');
            this.cloneImg.className = 'clone';
            src = '';
            this.cloneImg.style.opacity = 0;
            this.previewEl.appendChild(this.cloneImg);
        }
        else {
            this.cloneImg.style.opacity = 1;
            // set top/left/width/height of grid item's image to the clone
            this.cloneImg.style.width = settings.width  + 'px';
            this.cloneImg.style.height = settings.height  + 'px';
            this.cloneImg.style.top = settings.top  + 'px';
            this.cloneImg.style.left = settings.left  + 'px';
        }

        this.cloneImg.setAttribute('src', src);
    };

    /**
     * closes the original/large image view
     */
    GridFx.prototype._closeItem = function() {
        if( !this.isExpanded || this.isAnimating ) return;
        this.isExpanded = false;
        this.isAnimating = true;

        // the grid item's image and its offset
        var gridItem = this.items[this.current],
            gridImg = gridItem.querySelector('.real-img'),
            gridImgOffset = gridImg.getBoundingClientRect(),
            self = this;

        classie.remove(this.previewEl, 'preview--open');
        classie.remove(this.previewEl, 'preview--image-loaded');

        // callback
        this.options.onCloseItem(this, gridItem);

        // large image will animate back to the position of its grid's item
        classie.add(this.originalImg, 'animate');

        // set the transform to the original/large image
        var win = this._getWinSize(),
            dx = gridImgOffset.left + gridImg.offsetWidth/2 - ((this.options.imgPosition.x > 0 ? 1-Math.abs(this.options.imgPosition.x) : Math.abs(this.options.imgPosition.x)) * win.width + this.options.imgPosition.x * win.width/2),
            dy = gridImgOffset.top + gridImg.offsetHeight/2 - ((this.options.imgPosition.y > 0 ? 1-Math.abs(this.options.imgPosition.y) : Math.abs(this.options.imgPosition.y)) * win.height + this.options.imgPosition.y * win.height/2),
            z = gridImg.offsetWidth/this.originalImg.offsetWidth;

        this.originalImg.style.WebkitTransform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';
        this.originalImg.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';

        // once that's done..
        onEndTransition(this.originalImg, function() {
            // clear description
            self.previewDescriptionEl.innerHTML = '';

            // show original grid item
            classie.remove(gridItem, 'grid__item--current');

            // fade out the original image
            setTimeout(function() { self.originalImg.style.opacity = 0;	}, 60);

            // and after that
            onEndTransition(self.originalImg, function() {
                // reset original/large image
                classie.remove(self.originalImg, 'animate');
                self.originalImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
                self.originalImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';

                self.isAnimating = false;
            });
        });
    };

    /**
     * gets the window sizes
     */
    GridFx.prototype._getWinSize = function() {
        return {
            width: document.documentElement.clientWidth,
            height: window.innerHeight
        };
    };

    window.GridFx = GridFx;

})(window);

(function() {
    var support = { transitions: Modernizr.csstransitions },
        // transition end event name
        transEndEventNames = { 'WebkitTransition': 'webkitTransitionEnd', 'MozTransition': 'transitionend', 'OTransition': 'oTransitionEnd', 'msTransition': 'MSTransitionEnd', 'transition': 'transitionend' },
        transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
        onEndTransition = function( el, callback ) {
            var onEndCallbackFn = function( ev ) {
                if( support.transitions ) {
                    if( ev.target != this ) return;
                    this.removeEventListener( transEndEventName, onEndCallbackFn );
                }
                if( callback && typeof callback === 'function' ) { callback.call(this); }
            };
            if( support.transitions ) {
                el.addEventListener( transEndEventName, onEndCallbackFn );
            }
            else {
                onEndCallbackFn();
            }
        };

    globalgrid = new GridFx(document.querySelector('.grid'), {
        imgPosition : {
            x : -0.5,
            y : 1
        },
        onOpenItem : function(instance, item) {
            instance.items.forEach(function(el) {
                if(item != el) {
                    var delay = Math.floor(Math.random() * 50);
                    el.style.WebkitTransition = 'opacity .5s ' + delay + 'ms cubic-bezier(.7,0,.3,1), -webkit-transform .5s ' + delay + 'ms cubic-bezier(.7,0,.3,1)';
                    el.style.transition = 'opacity .5s ' + delay + 'ms cubic-bezier(.7,0,.3,1), transform .5s ' + delay + 'ms cubic-bezier(.7,0,.3,1)';
                    el.style.WebkitTransform = 'scale3d(0.1,0.1,1)';
                    el.style.transform = 'scale3d(0.1,0.1,1)';
                    el.style.opacity = 0;
                }
            });
        },
        onCloseItem : function(instance, item) {
            instance.items.forEach(function(el) {
                if(item != el) {
                    el.style.WebkitTransition = 'opacity .4s, -webkit-transform .4s';
                    el.style.transition = 'opacity .4s, transform .4s';
                    el.style.WebkitTransform = 'scale3d(1,1,1)';
                    el.style.transform = 'scale3d(1,1,1)';
                    el.style.opacity = 1;

                    onEndTransition(el, function() {
                        el.style.transition = 'none';
                        el.style.WebkitTransform = 'none';
                    });
                }
            });
        }
    });
})();


jQuery(document).ready(function($){
    var now = new Date();
    console.log(now.toDateString().split(" ")[2] + "-" + now.toDateString().split(" ")[1] + "-" + now.toDateString().split(" ")[3] + " - " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds());
    now.setDate( 0 );
    console.log(now.toLocaleString('en-US', {month: 'long'}) + " - " + now.getFullYear());

    $('#settings-btn').on('click', function(e) {
        $('#settings-modal').modal('show');
    });

    var CheckboxDropdown = function(el) {
        var _this = this;
        this.isOpen = false;
        this.areAllChecked = false;
        this.$el = $(el);
        this.$label = this.$el.find('.dropdown1-label');
        this.$checkAll = this.$el.find('[data-toggle="check-all"]').first();
        this.$inputs = this.$el.find('[type="checkbox"],[type="radio"]');
        var text = this.$label.text();


        this.onCheckBox();

        this.$label.on('click', function(e) {
            e.preventDefault();
            _this.toggleOpen();
        });

        this.$checkAll.on('click', function(e) {
            e.preventDefault();
            _this.onCheckAll(text);
        });

        this.$inputs.on('change', function(e) {
            _this.onCheckBox(text);
        });
    };

    CheckboxDropdown.prototype.onCheckBox = function(text) {
        this.updateStatus(text);
    };


    CheckboxDropdown.prototype.updateStatus = function(text) {
        var checked = this.$el.find(':checked');


        var monthel = document.querySelector('#dropdown-month');
        var mnts = [];

        for(var i=0; i<$(monthel).find(':checked').length; i++)
            mnts.push($($(monthel).find(':checked')[i]).attr('value'));

        setFiles(mnts)

        this.areAllChecked = false;
        this.$checkAll.html('Check All');

        if(checked.length <= 0) {
            this.$label.html(text);
        }
        else if(checked.length === this.$inputs.length) {
            this.$label.html('All Selected');
            this.areAllChecked = true;
            this.$checkAll.html('Uncheck All');
        }
        else if(checked.length === 1) {
            this.$label.html(checked.parent('label').text());
        }
        else {
            this.$label.html(checked.length + ' Selected');
        }
    };

    CheckboxDropdown.prototype.onCheckAll = function(text, checkAll) {
        if(!this.areAllChecked || checkAll) {
            this.areAllChecked = true;
            this.$checkAll.html('Uncheck All');
            this.$inputs.prop('checked', true);
        }
        else {
            this.areAllChecked = false;
            this.$checkAll.html('Check All');
            this.$inputs.prop('checked', false);
        }

        this.updateStatus(text);
    };

    CheckboxDropdown.prototype.toggleOpen = function(forceOpen) {
        var _this = this;

        if(!this.isOpen || forceOpen) {
            this.isOpen = true;
            this.$el.addClass('on');
            this.$label.on('click', function(e) {
                if(!$(e.target).closest('[data-control]').length) {
                    _this.toggleOpen();
                }
            });
        }
        else {
            this.isOpen = false;
            this.$el.removeClass('on');
        }
    };

    var checkboxesDropdowns = document.querySelectorAll('[data-control="checkbox-dropdown"]');
    for(var i = 0, length = checkboxesDropdowns.length; i < length; i++) {
        new CheckboxDropdown(checkboxesDropdowns[i]);
    }

    $('#delete-access').click(function () {
        $('#delete-modal').modal('hide');
        $.ajax({
            url: '/delete-file',
            data: {file: deletefile},
            type: 'POST',
            success: function(data){
                $('#alert-modal-title').html('Delete Successful!');
                $('#alert-modal-body').html('The file has been deleted.<br>Redirecting you back to the homepage.');
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

    $('#send-access').click(function () {
        $('#send-modal').modal('hide');
        $.ajax({
            url: '/send-file',
            data: {file: sendfile},
            type: 'POST',
            success: function(data){
                $('#alert-modal-title').html('Send Successful!');
                $('#alert-modal-body').html('The file have been sent.<br>Redirecting you back to the homepage.');
                $('#alert-modal').modal('show');
                setTimeout(function () {
                    window.location.href = '/';
                }, 3000);
            },
            error: function(jqXHR){
                $('#alert-modal-title').html('Send Failure!');
                $('#alert-modal-body').html('Sorry. There was a problem, please try again later.');
                $('#alert-modal').modal('show');
            }
        });
    });

    $('#sendall-btn').click(function () {
        $.ajax({
            url: '/sendall',
            data: {files: filesel},
            type: 'POST',
            success: function(data){
                $('#alert-modal-title').html('Send Successful!');
                $('#alert-modal-body').html('The files have been sent.<br>Redirecting you back to the homepage.');
                $('#alert-modal').modal('show');
                setTimeout(function () {
                    window.location.href = '/';
                }, 3000);
            },
            error: function(jqXHR){
                $('#alert-modal-title').html('Send Failure!');
                $('#alert-modal-body').html('Sorry. There was a problem, please try again later.');
                $('#alert-modal').modal('show');
            }
        });
    });

    $('#settings-form').ajaxForm({
        type: 'POST',
        url: '/settings',
        success: function (responseText, status, xhr, $form) {
            if (status == 'success'){
                $('#settings-modal').modal('hide');
                $('#alert-modal-title').html('Success!');
                $('#alert-modal-body').html('The settings has been saved.<br>Redirecting you back to the homepage.');
                $('#alert-modal').modal('show');
                setTimeout(function(){window.location.href = '/';}, 3000);
            }
        },
        error: function (e) {
            $('#settings-modal').modal('hide');
            $('#alert-modal-title').html('Failure!');
            $('#alert-modal-body').html('Sorry. There was a problem, please try again later.');
            $('#alert-modal').modal('show');
        }
    });
});


'use strict';

;( function ( document, window, index )
{
    // feature detection for drag&drop upload
    var isAdvancedUpload = function()
    {
        var div = document.createElement( 'div' );
        return ( ( 'draggable' in div ) || ( 'ondragstart' in div && 'ondrop' in div ) ) && 'FormData' in window && 'FileReader' in window;
    }();


    // applying the effect for every form
    var forms = document.querySelectorAll( '.box' );
    Array.prototype.forEach.call( forms, function( form )
    {
        var input		 = form.querySelector( 'input[type="file"]' ),
            label		 = form.querySelector( 'label' ),
            errorMsg	 = form.querySelector( '.box__error span' ),
            restart		 = form.querySelectorAll( '.box__restart' ),
            droppedFiles = false,
            uploadFiles  = false,
            showFiles	 = function( files )
            {
                label.textContent = files.length > 1 ? ( input.getAttribute( 'data-multiple-caption' ) || '' ).replace( '{count}', files.length ) : files[ 0 ].name;
            },
            triggerFormSubmit = function()
            {
                var event = document.createEvent( 'HTMLEvents' );
                event.initEvent( 'submit', true, false );
                form.dispatchEvent( event );
            };

        // letting the server side to know we are going to make an Ajax request
        var ajaxFlag = document.createElement( 'input' );
        ajaxFlag.setAttribute( 'type', 'hidden' );
        ajaxFlag.setAttribute( 'name', 'ajax' );
        ajaxFlag.setAttribute( 'value', 1 );
        form.appendChild( ajaxFlag );

        // automatically submit the form on file select
        input.addEventListener( 'change', function( e )
        {
            showFiles( e.target.files );
            uploadFiles = true;
        });

        // drag&drop files if the feature is available
        if( isAdvancedUpload )
        {
            form.classList.add( 'has-advanced-upload' ); // letting the CSS part to know drag&drop is supported by the browser

            [ 'drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop' ].forEach( function( event )
            {
                form.addEventListener( event, function( e )
                {
                    // preventing the unwanted behaviours
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            [ 'dragover', 'dragenter' ].forEach( function( event )
            {
                form.addEventListener( event, function()
                {
                    form.classList.add( 'is-dragover' );
                });
            });
            [ 'dragleave', 'dragend', 'drop' ].forEach( function( event )
            {
                form.addEventListener( event, function()
                {
                    form.classList.remove( 'is-dragover' );
                });
            });
            form.addEventListener( 'drop', function( e )
            {
                droppedFiles = e.dataTransfer.files; // the files that were dropped
                showFiles( droppedFiles );
            });
        }


        // if the form was submitted
        $('#upload').click(function(){
            if( droppedFiles || uploadFiles ) {
                // preventing the duplicate submissions if the current one is in progress

                document.getElementById("change-month").checked = false;
                $('#add-file-modal').modal('show');
            }
            else
            {
                $('#alert-modal-title').html('Upload Failure!');
                $('#alert-modal-body').html('Please select a file before attempting to upload.');
                $('#alert-modal').modal('show');
            }
        });

        $('#add-file-submit').click(function(e){
            $('#add-file-modal').modal('hide');
            if( isAdvancedUpload ) // ajax file upload for modern browsers
            {
                console.log("here");
                e.preventDefault();

                // gathering the form data
                var ajaxData = new FormData( form );
                ajaxData.append("addcommit" , $('input[name=add-commit]').val());
                ajaxData.append("changemonth" , document.getElementById("change-month").checked);
                ajaxData.append("month" , $('select[name=select-month]').val());
                console.log(ajaxData);
                if( droppedFiles )
                {
                    Array.prototype.forEach.call( droppedFiles, function( file )
                    {
                        ajaxData.append( input.getAttribute( 'name' ), file );
                    });
                }
                // ajax request
                var ajax = new XMLHttpRequest();
                ajax.open( form.getAttribute( 'method' ), form.getAttribute( 'action' ), true );

                ajax.onload = function()
                {
                    if( ajax.status >= 200 && ajax.status < 400 )
                    {
                        if(ajax.responseText == 'ok')
                        {
                            $('#alert-modal-title').html('Upload Success!');
                            $('#alert-modal-body').html('The file has been uploaded to the system, Refreshing the page.');
                            $('#alert-modal').modal('show');
                            setTimeout(function(){window.location.href = '/home';}, 3000);
                        }
                        else
                        {
                            $('#alert-modal-title').html('Upload Failure!');
                            $('#alert-modal-body').html('The file you want to upload is not supported, please try again.');
                            $('#alert-modal').modal('show');
                        }
                    }
                };

                ajax.send( ajaxData );
            }
        });

        document.getElementById("change-month").addEventListener("change", function()
        {
            if (document.getElementById("change-month").checked == true)
            {
                document.getElementById("select-month").style.display = "block";
            }
            else
            {
                document.getElementById("select-month").style.display = "none";
            }
        });


        // restart the form if has a state of error/success
        Array.prototype.forEach.call( restart, function( entry )
        {
            entry.addEventListener( 'click', function( e )
            {
                e.preventDefault();
                form.classList.remove( 'is-error', 'is-success' );
                input.click();
            });
        });

        // Firefox focus bug fix for file input
        input.addEventListener( 'focus', function(){ input.classList.add( 'has-focus' ); });
        input.addEventListener( 'blur', function(){ input.classList.remove( 'has-focus' ); });

    });
}( document, window, 0 ));

(function(e,t,n){var r=e.querySelectorAll("html")[0];r.className=r.className.replace(/(^|\s)no-js(\s|$)/,"$1js$2")})(document,window,0);

function setFiles(month)
{
    filesel = [];

    for(var i=0; i<user.files.length; i++)
    {
        filesel.push(user.files[i]);
    }
    filesel.sort((d1, d2) => new Date(d2.date).getTime() - new Date(d1.date).getTime());

    for(i=0;i<filesel.length; i++) {
        if (month && month.length > 0 && !month.includes(filesel[i].dir))         // date filter
        {
            filesel.splice(i, 1);
            i--;
            continue;
        }
    }

    if(filesel.length > 0)
    {
        $('.foundgrids').hide();
        let output = '';
        for(i=0; i<filesel.length; i++)
        {
            output += `<div class="grid__item" data-size="512x512">
                            <div class="movie-hover">
                                <div class="dit-hover">
                                    <button class="btn btfooter">View Details</button>
                                </div>
                                <a class="img-wrap" href="/css/pdf.png"><img class="real-img" src="/css/pdf.png" width="200" height="200"></a>
                            <div class="description description--grid">
                    <h1>${filesel[i].name}</h1>
                    <p><em>— ${new Date(filesel[i].date).getDate() + "/" + (new Date(filesel[i].date).getMonth() + 1) + "/" + new Date(filesel[i].date).getFullYear()}</em></p>
            <p>${filesel[i].commit}</p>
            <br>
            <button class="btn btfooter deletebtn" value=${filesel[i].src.replaceAll(" ","%20")} style="float: right; margin-top: 1.1em; width: 180px; max-width: 25%; margin-right: 50px; outline:none; color: white;">Delete</button>
            <button class="btn btfooter sendbtn" value=${filesel[i].src.replaceAll(" ","%20")} style="float: right; margin-top: 1.1em; width: 180px; max-width: 25%; margin-right: 50px; outline:none; color: white;">Send</button>
            <a href=${filesel[i].src.split("public/")[1].replaceAll(" ", "%20")} download=${filesel[i].name}><button class="btn btfooter" style="float: right; margin-top: 1.1em; width: 180px; max-width: 25%; margin-right: 50px; outline:none; color: white;">Download</button></a>
            <a class="fancybox" data-fancybox="" href=${filesel[i].src.split("public/")[1].replaceAll(" ", "%20")}><button class="btn btfooter" style="float: right; margin-top: 1.1em; width: 180px; max-width: 25%; margin-right: 50px; outline:none; color: white;">Preview</button></a>
            </div></div><div class="grid-movie-bottom"><div class="movie-title">${filesel[i].name}</div></div></div>`
            console.log(filesel[i].src)
        }
        $('.grid').html(output);
        globalgrid.items = [].slice.call(document.querySelectorAll('.grid__item'));
        globalgrid._init();
    }
    else
    {
        $('.foundgrids').show();
        $('.grid').html("");
        globalgrid.items = [].slice.call(document.querySelectorAll('.grid__item'));
        globalgrid._init();
    }
}