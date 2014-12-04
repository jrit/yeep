(function(AudioContext) {
	AudioContext.prototype.createWhiteNoise = function(bufferSize) {
		bufferSize = bufferSize || 4096;
		var node = this.createScriptProcessor(bufferSize, 1, 1);
		node.onaudioprocess = function(e) {
			var output = e.outputBuffer.getChannelData(0);
			for (var i = 0; i < bufferSize; i++) {
				output[i] = Math.random() * 2 - 1;
			}
		}
		return node;
	};

	AudioContext.prototype.createPinkNoise = function(bufferSize) {
		bufferSize = bufferSize || 4096;
		var b0, b1, b2, b3, b4, b5, b6;
		b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
		var node = this.createScriptProcessor(bufferSize, 1, 1);
		node.onaudioprocess = function(e) {
			var output = e.outputBuffer.getChannelData(0);
			for (var i = 0; i < bufferSize; i++) {
				var white = Math.random() * 2 - 1;
				b0 = 0.99886 * b0 + white * 0.0555179;
				b1 = 0.99332 * b1 + white * 0.0750759;
				b2 = 0.96900 * b2 + white * 0.1538520;
				b3 = 0.86650 * b3 + white * 0.3104856;
				b4 = 0.55000 * b4 + white * 0.5329522;
				b5 = -0.7616 * b5 - white * 0.0168980;
				output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
				output[i] *= 0.11; // (roughly) compensate for gain
				b6 = white * 0.115926;
			}
		}
		return node;
	};

	AudioContext.prototype.createBrownNoise = function(bufferSize) {
		bufferSize = bufferSize || 4096;
		var lastOut = 0.0;
		var node = this.createScriptProcessor(bufferSize, 1, 1);
		node.onaudioprocess = function(e) {
			var output = e.outputBuffer.getChannelData(0);
			for (var i = 0; i < bufferSize; i++) {
				var white = Math.random() * 2 - 1;
				output[i] = (lastOut + (0.02 * white)) / 1.02;
				lastOut = output[i];
				output[i] *= 3.5; // (roughly) compensate for gain
			}
		}
		return node;
	};
})(window.AudioContext || window.webkitAudioContext);


( function ( yeep )
{
    "use strict";

    var defaults = {
        logging: true
    };

    var settings = {};

    yeep.tracks = {};
    yeep.envelopes = {};
    yeep.tones = {};
    yeep.notes = {};

    yeep.log = function ()
    {
        if ( settings.logging )
        {
            console.log.apply( console, arguments );
        }
    };

    yeep.extend = function ( target )
    {
        for ( var i = 1; i < arguments.length; i++ )
        {
            var source = arguments[ i ];
            if ( source )
            {
                Object.keys( source ).forEach( function ( key )
                {
                    target[ key ] = source[ key ];
                } );
            }
        }
        return ( target );
    };

    yeep.play = function ( soundName, options )
    {
        //TODO: add options for repeats and what-not
        yeep.tracks[ soundName ]();
    };

    yeep.audioCtx = new ( window.AudioContext || window.webkitAudioContext )();

    return ( yeep );

} )( this.yeep = {} );


( function ( envelopes )
{
    "use strict";

    envelopes.ar = function ( options )
    {
        var defaults = {
            delaySec: 0,
            attackSec: 0.05,
            attackVol: 1,
            releaseSec: 0.02
        };

        var set = yeep.extend( {}, defaults, options );

        var now = yeep.audioCtx.currentTime;

        var gainNode = yeep.audioCtx.createGain();
        gainNode.gain.setValueAtTime( 0, 0 );
        gainNode.gain.setValueAtTime( 0.00001, now + set.delaySec );
        gainNode.gain.exponentialRampToValueAtTime( set.attackVol, now + set.delaySec + set.attackSec );
        gainNode.gain.exponentialRampToValueAtTime( 0.00001, now + set.delaySec + set.attackSec + set.releaseSec );

        return ( gainNode );
    };

    envelopes.adsr = function ( options )
    {
        var defaults = {
            delaySec: 0,
            attackSec: 0.05,
            attackVol: 1,
            decaySec: 0.02,
            decayVol: 0.8,
            sustainSec: 0.2,
            releaseSec: 0.02
        };

        var set = yeep.extend( {}, defaults, options );

        var now = yeep.audioCtx.currentTime;

        var gainNode = yeep.audioCtx.createGain();
        gainNode.gain.setValueAtTime( 0, 0 );
        gainNode.gain.setValueAtTime( 0.00001, now + set.delaySec );
        gainNode.gain.exponentialRampToValueAtTime( set.attackVol, now + set.delaySec + set.attackSec );
        gainNode.gain.exponentialRampToValueAtTime( set.decayVol, now + set.delaySec + set.attackSec + set.decaySec );
        gainNode.gain.exponentialRampToValueAtTime( set.decayVol, now + set.delaySec + set.attackSec + set.decaySec + set.sustainSec );
        gainNode.gain.exponentialRampToValueAtTime( 0.00001, now + set.delaySec + set.attackSec + set.decaySec + set.sustainSec + set.releaseSec );

        return ( gainNode );
    }

    return ( envelopes );

} )( this.yeep.envelopes );


( function ( yeep )
{
    "use strict";

    yeep.notes = ( function ()
    {
        var result = {};
        var notes = [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ];
        var noteIndex = 0;

        for ( var freq = 16.35161; freq < 20000; freq *= Math.pow( 2, 1 / 12 ) )
        {
            result[ notes[ noteIndex % 12 ] + ( Math.floor( noteIndex / 12 ) ) ] = freq;
            noteIndex++;
        }
        return ( result );
    } )();

    return ( yeep.notes );

} )( this.yeep );


( function ( tones )
{
    "use strict";

    tones.ar = function ( options )
    {
        var defaults = {
            oscType: "sine",
            freq: yeep.notes.C4,
            delaySec: 0,
            upSec: 0.05,
            vol: 0.4,
            downSec: 0.5
        };

        var set = yeep.extend( {}, defaults, options );

        set.attackSec = set.upSec;
        set.attackVol = set.vol;
        set.decaySec = 0;
        set.sustainSec = 0;
        set.releaseSec = set.downSec;

        return( tones.adsr( set ) );
    };

    tones.adsr = function ( options )
    {
        var defaults = {
            oscType: "sine",
            freq: yeep.notes.C4,
            delaySec: 0,
            attackSec: 0.05,
            attackVol: 1,
            decaySec: 0.02,
            decayVol: 0.8,
            sustainSec: 0.2,
            releaseSec: 0.02,
            preGainFilters: [],
            postGainFilters: []
        };

        var set = yeep.extend( {}, defaults, options );

        var osc = yeep.audioCtx.createOscillator();
        osc.frequency.setValueAtTime( set.freq, 0 );
        osc.type = set.oscType;

        var lastNode = osc;
        var gainNode = yeep.envelopes.adsr( set );

        set.preGainFilters.forEach( function ( filter )
        {
            lastNode.connect( filter );
            lastNode = filter;
        } );

        lastNode.connect( gainNode );
        lastNode = gainNode;

        set.postGainFilters.forEach( function ( filter )
        {
            lastNode.connect( filter );
            lastNode = filter;
        } );

        lastNode.connect( yeep.audioCtx.destination );

        var now = yeep.audioCtx.currentTime;
        osc.start( now );
        osc.stop( now + set.delaySec + set.attackSec + set.decaySec + set.sustainSec + set.releaseSec );

        return ( lastNode );
    };

    return ( tones );

} )( this.yeep.tones );


( function ( tracks )
{
    "use strict";

    var extend = yeep.extend;

    var notification = {
        "ping": function ()
        {
            yeep.tones.ar( { freq: yeep.notes.C5 } );
        },
        "add": function ()
        {
            yeep.tones.ar( { freq: yeep.notes.C5 } );
            yeep.tones.ar( { freq: yeep.notes.E5, delaySec: 0.2 } );
        },
        "remove": function ()
        {
            yeep.tones.ar( { freq: yeep.notes.E5 } );
            yeep.tones.ar( { freq: yeep.notes.C5, delaySec: 0.2 } );
        },
        "ring": function ()
        {
            for ( var i = 0; i < 2; i++ )
            {
                yeep.tones.ar( { freq: yeep.notes.C5, delaySec: 0.8 * i } );
                yeep.tones.ar( { freq: yeep.notes.C5, delaySec: 0.8 * i + 0.3 } );
                yeep.tones.ar( { freq: yeep.notes.G5, delaySec: 0.8 * i + 0.4 } );
                yeep.tones.ar( { freq: yeep.notes.E5, delaySec: 0.8 * i + 0.5 } );
            }
        }
    };

    var tunes = {
        "sadTrombone": function ()
        {
            var base = { oscType: "triangle", delaySec: 0, attackSec: 0.5, sustainSec: 0.5, decayVol: 1 };

            yeep.tones.adsr( extend( {}, base, { freq: yeep.notes[ "D4" ], delaySec: 0 } ) );
            yeep.tones.adsr( extend( {}, base, { freq: yeep.notes[ "C#4" ], delaySec: 0.75, sustainSec: 0.5 } ) );
            yeep.tones.adsr( extend( {}, base, { freq: yeep.notes[ "C4" ], delaySec: 1.5, sustainSec: 0.5 } ) );
            yeep.tones.adsr( extend( {}, base, { freq: yeep.notes[ "B3" ], delaySec: 2.25, sustainSec: 1.5, releaseSec: 0.5 } ) );
        },
        "zelda": function ()
        {
            var base = { oscType: "triangle", attackSec: 0.1, attackVol: 0.4, decayVol: 0.4, releaseSec: 0.1 };

            yeep.tones.adsr( extend( {}, base, { delaySec: 0.0, freq: yeep.notes["D#3"] } ) );
            yeep.tones.adsr( extend( {}, base, { delaySec: 0.0, freq: yeep.notes["A4"] } ) );

            yeep.tones.adsr( extend( {}, base, { delaySec: 0.2, freq: yeep.notes["E3"] } ) );
            yeep.tones.adsr( extend( {}, base, { delaySec: 0.2, freq: yeep.notes["A#4"] } ) );

            yeep.tones.adsr( extend( {}, base, { delaySec: 0.4, freq: yeep.notes["F3"] } ) );
            yeep.tones.adsr( extend( {}, base, { delaySec: 0.4, freq: yeep.notes["B4"] } ) );

            yeep.tones.adsr( extend( {}, base, { delaySec: 0.6, freq: yeep.notes["F#3"], sustainSec: 0.8 } ) );
            yeep.tones.adsr( extend( {}, base, { delaySec: 0.6, freq: yeep.notes["C5"], sustainSec: 0.8 } ) );
        }
    };

    var drums = {
        "snare": function ( options )
        {
            options = options || {};
            var lp = yeep.audioCtx.createBiquadFilter();

            lp.type = "lowpass";
            lp.frequency.setValueAtTime( 5000, yeep.audioCtx.currentTime + ( options.delaySec || 0 ) );
            lp.frequency.exponentialRampToValueAtTime( 3000, yeep.audioCtx.currentTime + 0.1 + ( options.delaySec || 0 ) );

            var noise = yeep.audioCtx.createWhiteNoise();
            var noiseGain = yeep.envelopes.ar( { attackSec: 0, attackVol: 2, releaseSec: 1, delaySec: options.delaySec || 0 } );

            noise.connect( noiseGain );
            noiseGain.connect( lp );
            lp.connect( yeep.audioCtx.destination );
        },
        "kick": function ( options )
        {
            var lp = yeep.audioCtx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 500;
            lp.frequency.setValueAtTime( 500, yeep.audioCtx.currentTime + ( options.delaySec || 0 ) );
            lp.frequency.exponentialRampToValueAtTime( 1, yeep.audioCtx.currentTime + 0.4 + ( options.delaySec || 0 ) );

            var postGain = yeep.audioCtx.createGain();
            postGain.gain.value = 1.5; //TODO: doesn't amplify in firefox, ok in chrome

            yeep.tones.ar( extend( {}, { oscType: "square", freq: yeep.notes[ "A1" ], upSec: 0.02, downSec: 0.6, vol: 1, postGainFilters: [ lp, postGain ] }, options ) );
        },
        "splash": function ( options )
        {
            options = options || {};
            var lp = yeep.audioCtx.createBiquadFilter();

            lp.type = "highpass";
            lp.frequency.value = 1500;
            lp.frequency.setValueAtTime( 1500, yeep.audioCtx.currentTime + ( options.delaySec || 0 ) );
            lp.frequency.exponentialRampToValueAtTime( 3000, yeep.audioCtx.currentTime + 0.5 + ( options.delaySec || 0 ) );

            var noise = yeep.audioCtx.createWhiteNoise();
            var noiseGain = yeep.envelopes.ar( { attackSec: 0, attackVol: 1, releaseSec: 2, delaySec: options.delaySec || 0 } );

            noise.connect( noiseGain );
            noiseGain.connect( lp );
            lp.connect( yeep.audioCtx.destination );
        },
        "rimshot": function ()
        {
            yeep.tracks.snare();
            yeep.tracks.kick( { delaySec: 0.3 } );
            yeep.tracks.splash( { delaySec: 0.9 } );
        },
        "beat": function ()
        {
            yeep.tracks.kick( { delaySec: 0 } );
            yeep.tracks.kick( { delaySec: 0.125 } );
            yeep.tracks.kick( { delaySec: 0.5 } );
            yeep.tracks.kick( { delaySec: 0.625 } );

            yeep.tracks.snare( { delaySec: 0.5 } );

            yeep.tracks.splash( { delaySec: 0 } );
            yeep.tracks.splash( { delaySec: 0.25 } );
            yeep.tracks.splash( { delaySec: 0.5 } );
            yeep.tracks.splash( { delaySec: 0.75 } );
        }
    };

    yeep.extend( tracks, notification, tunes, drums );

    return ( tracks );

} )( this.yeep.tracks );