[![npm version](https://badge.fury.io/js/homebridge-millheat.svg)](https://www.npmjs.com/package/homebridge-millheat)

# homebridge-millheat

Homebridge plugin for Mill heaters

The only reason this extension exist is thanks to Andreas Stræte. I have done only minor changes to it in order 
to make it work for my 3.gen Mill wall mounted heaters. I do plan to keep using this plugin for this only until Mill
& Apple Home supports Matter. Then this will be deprecated. 


## Installation

```
npm install homebridge-millheat -g
```

## Configuration

```javascript
{
    "platforms": [
        {
            "platform": "millheat",
            "name": "millheat",
            "username" : "your@email",
            "password": "hunter2",
            "ignoredDevices": []
        }
    ]
}

```

## Features

Modes:

- Independent devices: HEAT, OFF
- Room assigned devices: AUTO, HEAT, OFF

If set to AUTO, you can't change the target temperature. This is set by room program. If set to HEAT, it will be set to independent mode, and you can adjust the temperature. If set to AUTO again it will return to room assigned program.

## Caveats

- Only tested with room assigned heaters
- Only tested with celcius as unit
- Tested with Node.js Version v12.15.0 and homebridge 0.4.50