# URL Parameters

The Starknet Agent supports URL parameters to pre-configure the chat experience.

## Available Parameters

### `prompt`
Sets the initial message to be sent automatically when the chat loads.

**Example:**
```
https://your-domain.com/?prompt=How+do+I+deploy+a+contract+on+Starknet
```

### `hints`
Sets the focus mode (data source) for the chat. This determines which documentation or source the agent will search in.

**Available values:**
- `search` - All of Starknet Ecosystem (default)
- `cairo-book` - Cairo Book
- `starknet-docs` - Starknet Docs
- `starknet-foundry` - Starknet Foundry
- `cairo-by-example` - Cairo By Example
- `openzeppelin-docs` - OpenZeppelin Docs
- `scarb-docs` - Scarb Docs
- `starknet-js` - Starknet.js Docs

**Example:**
```
https://your-domain.com/?hints=cairo-book
```

### `q` (Legacy)
Legacy parameter for setting the initial message. Still supported for backward compatibility.

## Combined Usage

You can combine both parameters to set both the data source and initial message:

**Example:**
```
https://your-domain.com/?hints=search&prompt=Read+from+https%3A%2F%2Fdocs.starknet.io+so+I+can+ask+questions+about+it
```

This will:
1. Set the focus mode to "All of Starknet Ecosystem" (`search`)
2. Automatically send the message "Read from https://docs.starknet.io so I can ask questions about it"

## URL Encoding

Remember to URL-encode special characters in your prompt:
- Spaces become `+` or `%20`
- Special characters like `:` become `%3A`
- `/` becomes `%2F`
- `?` becomes `%3F`
- `&` becomes `%26`
- `=` becomes `%3D`