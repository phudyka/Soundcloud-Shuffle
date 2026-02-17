'use strict';
// Runs at document_start — captures SoundCloud's audio element AND GainNode
// Must run before SoundCloud's JS so we intercept audio creation
const hook = document.createElement('script');
hook.textContent = `(function(){
    // Capture audio element when it starts playing
    var origPlay = HTMLMediaElement.prototype.play;
    window.__scMedia = null;
    HTMLMediaElement.prototype.play = function(){
        window.__scMedia = this;
        return origPlay.apply(this, arguments);
    };

    // Capture GainNode for volume control (SoundCloud uses Web Audio API)
    window.__scGain = null;
    if (typeof AudioContext !== 'undefined') {
        var origCreateGain = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function(){
            var node = origCreateGain.call(this);
            window.__scGain = node;
            return node;
        };
    }
    if (typeof webkitAudioContext !== 'undefined') {
        var origCreateGain2 = webkitAudioContext.prototype.createGain;
        webkitAudioContext.prototype.createGain = function(){
            var node = origCreateGain2.call(this);
            window.__scGain = node;
            return node;
        };
    }
})();`;
(document.head || document.documentElement).appendChild(hook);
hook.remove();
