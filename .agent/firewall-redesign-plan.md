# VyOS 1.5+ Firewall Implementation Plan

## Current State Analysis

### Problems with Current Implementation:
1. **Uses OLD VyOS firewall structure** (`firewall name <name>`)
   - VyOS 1.5+ uses new structure: `firewall ipv4 {forward|input|output} filter`
2. **Missing functionality**:
   - Add Ruleset button has no handler
   - Delete Rule button has no handler
   - Cannot delete rulesets
3. **Incorrect API paths**: Queries `['firewall', 'config']` instead of proper VyOS structure

---

## VyOS 1.5+ Firewall Structure

### New Hierarchy:
```
firewall
├── ipv4
│   ├── forward
│   │   └── filter
│   │       ├── default-action
│   │       └── rule
│   │           └── <number>
│   ├── input
│   │   └── filter
│   ├── output
│   │   ├── filter
│   │   └── raw
│   ├── prerouting
│   │   └── raw
│   └── name
│       └── <custom_name>  # Custom chains
├── ipv6
│   └── (same structure)
├── bridge
│   └── (bridge-specific)
└── group
    ├── address-group
    ├── network-group
    ├── port-group
    └── etc.
```

### Key Chains:
1. **forward filter**: Transit traffic (most common for router)
2. **input filter**: Traffic TO the router
3. **output filter**: Traffic FROM the router
4. **name <custom>**: Custom chains for jump actions

### Configuration Commands:
```bash
# Base chain
set firewall ipv4 forward filter default-action {accept|drop|reject}
set firewall ipv4 forward filter rule <number> action {accept|drop|reject|jump}
set firewall ipv4 forward filter rule <number> description "..."
set firewall ipv4 forward filter rule <number> source address <ip/cidr>
set firewall ipv4 forward filter rule <number> destination address <ip/cidr>
set firewall ipv4 forward filter rule <number> protocol {tcp|udp|icmp|all}
set firewall ipv4 forward filter rule <number> state {established|related|new|invalid}

# Custom chain
set firewall ipv4 name MY-CUSTOM-CHAIN default-action drop
set firewall ipv4 name MY-CUSTOM-CHAIN rule 10 ...
```

---

## Implementation Plan

### Phase 1: Research & API Testing (DONE)
- ✅ Review VyOS 1.5+ documentation
- ✅ Understand new firewall structure
- ✅ Identify base chains vs custom chains

### Phase 2: Data Structure Redesign

#### 2.1 Update API Queries
**Current**: `['firewall']` or `['firewall', 'config']`

**New**: Query each chain separately
- `['firewall', 'ipv4', 'forward', 'filter']` - Transit traffic
- `['firewall', 'ipv4', 'input', 'filter']` - To router
- `['firewall', 'ipv4', 'output', 'filter']` - From router
- `['firewall', 'ipv4', 'name']` - Custom chains

#### 2.2 Redesign UI Structure
**Old UI**: List of "rulesets" (custom names only)

**New UI**: 
```
Firewall Overview
├── Quick Stats
├── Base Chains (tabs or cards)
│   ├── Forward Filter (transit)
│   ├── Input Filter (to router)
│   └── Output Filter (from router)
└── Custom Chains
    └── List of custom named chains
```

### Phase 3: Component Architecture

#### 3.1 Main Page (`Firewall.jsx`)
**Purpose**: Overview and navigation

**Features**:
- Display base chain summaries (forward, input, output)
  - Rule count
  - Default action
  - Quick enable/disable
- List custom chains
- "Add Custom Chain" button (functional!)
- Navigation to chain detail views

#### 3.2 Chain Editor Component (new: `ChainEditor.jsx`)
**Purpose**: View and edit rules for a specific chain

**Props**:
- `chainType`: 'ipv4' | 'ipv6' | 'bridge'
- `chainPath`: ['forward', 'filter'] | ['input', 'filter'] | ['name', 'CUSTOM']
- `chainName`: Display name
- `onBack`: Return to overview

**Features**:
- Display all rules in table
- Add rule (functional!)
- Edit rule (functional!)
- Delete rule (functional!)
- Reorder rules (drag & drop - optional)
- Set default action
- Enable/disable chain

#### 3.3 Rule Form Component (`RuleForm.jsx`)
**Purpose**: Modal form for adding/editing rules

**Fields**:
- Rule number (auto-suggest next available)
- Action: accept, drop, reject, jump, continue
- Description
- Protocol: tcp, udp, icmp, icmp6, esp, ah, all
- **State matching**: established, related, new, invalid
- **Source**:
  - Address/network
  - Port (for tcp/udp)
  - MAC address
- **Destination**:
  - Address/network
  - Port (for tcp/udp)
- **Advanced**:
  - Interface (inbound/outbound)
  - Connection limit
  - Time-based matching
  - Recent connections tracking

### Phase 4: Command Generation

#### 4.1 Rule Command Builder
```javascript
function buildRuleCommands(chainPath, ruleNumber, ruleData) {
  const basePath = ['firewall', ...chainPath, 'rule', ruleNumber];
  const commands = [];
  
  // Always set action
  commands.push({ op: 'set', path: [...basePath, 'action', ruleData.action] });
  
  // Optional fields
  if (ruleData.description) {
    commands.push({ op: 'set', path: [...basePath, 'description', ruleData.description] });
  }
  
  if (ruleData.protocol && ruleData.protocol !== 'all') {
    commands.push({ op: 'set', path: [...basePath, 'protocol', ruleData.protocol] });
  }
  
  // State matching (connection tracking)
  if (ruleData.states && ruleData.states.length > 0) {
    ruleData.states.forEach(state => {
      commands.push({ op: 'set', path: [...basePath, 'state', state] });
    });
  }
  
  // Source
  if (ruleData.source?.address) {
    commands.push({ op: 'set', path: [...basePath, 'source', 'address', ruleData.source.address] });
  }
  if (ruleData.source?.port) {
    commands.push({ op: 'set', path: [...basePath, 'source', 'port', ruleData.source.port] });
  }
  
  // Destination
  if (ruleData.destination?.address) {
    commands.push({ op: 'set', path: [...basePath, 'destination', 'address', ruleData.destination.address] });
  }
  if (ruleData.destination?.port) {
    commands.push({ op: 'set', path: [...basePath, 'destination', 'port', ruleData.destination.port] });
  }
  
  return commands;
}
```

#### 4.2 Delete Rule Handler
```javascript
function deleteRule(chainPath, ruleNumber) {
  const basePath = ['firewall', ...chainPath, 'rule', ruleNumber];
  return [{ op: 'delete', path: basePath }];
}
```

#### 4.3 Create Custom Chain
```javascript
function createCustomChain(chainName, defaultAction) {
  return [{
    op: 'set',
    path: ['firewall', 'ipv4', 'name', chainName, 'default-action', defaultAction]
  }];
}
```

### Phase 5: UI/UX Enhancements

#### 5.1 Rule Table Improvements
- ✅ Sortable by rule number
- ✅ Color-coded actions (green=accept, red=drop/reject, yellow=jump)
- ✅ Show connection state (established/related badge)
- ✅ Inline quick actions (edit, delete, disable)
- ✅ Search/filter rules

#### 5.2 Best Practice Templates
Pre-configured rule templates:
1. **Allow Established/Related**: Essential first rule
2. **Block Invalid Packets**: Security hardening
3. **Allow SSH**: Safe remote access
4. **Allow ICMP**: Basic connectivity
5. **Drop All**: Default deny

#### 5.3 Validation
- Warn if no established/related rule exists
- Warn if default action is accept without specific rules
- Validate IP addresses and CIDRs
- Check for rule number conflicts
- Validate protocol/port combinations

### Phase 6: Testing Strategy

#### 6.1 Manual CLI Testing
Before implementing UI changes, test each command in VyOS CLI:
```bash
configure
set firewall ipv4 forward filter rule 10 action accept
set firewall ipv4 forward filter rule 10 state established
set firewall ipv4 forward filter rule 10 state related
commit
show firewall ipv4 forward filter
```

#### 6.2 UI Testing
1. Can view existing rules
2. Can add new rules
3. Can edit rules
4. Can delete rules
5. Can set default action
6. Rules persist after commit
7. UI refreshes after commit

---

## Implementation Order

### Step 1: Update Firewall Main Page
- Fix API query to use new paths
- Display base chains (forward, input, output)
- Show rule counts and default actions
- Keep it simple first - just viewing

### Step 2: Create Chain Editor Component
- Reuse/adapt existing RuleBuilder
- Update to support new chain paths
- Focus on forward filter first (most common)
- Add functional delete button

### Step 3: Implement Rule Management
- Fix rule form to use new command structure
- Add state matching (established/related)
- Add delete rule functionality
- Test with batch commits

### Step 4: Add Custom Chain Support
- Implement "Add Custom Chain" functionality
- Allow creating named chains
- Support jump actions to custom chains

### Step 5: Polish & Features
- Add rule templates
- Add validation
- improve UX
- Add IPv6 support (same structure)

---

## Files to Modify/Create

### Modify:
1. `/home/tim/Documents/VyOS_Web_UI/src/pages/Firewall.jsx`
   - Update API queries
   - Redesign UI for base chains + custom chains
   - Add functional "Add Custom Chain" button

2. `/home/tim/Documents/VyOS_Web_UI/src/components/RuleBuilder.jsx`
   - Rename to `ChainEditor.jsx` (or keep name)
   - Update to support new chain paths
   - Add state matching fields
   - Add delete rule functionality
   - Fix command generation for VyOS 1.5+

### Create:
1. `/home/tim/Documents/VyOS_Web_UI/src/components/RuleForm.jsx` (optional)
   - Extract form logic from ChainEditor
   - More comprehensive field support
   - Better validation

2. `/home/tim/Documents/VyOS_Web_UI/src/utils/firewallHelpers.js` (optional)
   - Command builders
   - Validation functions
   - Rule templates

---

## Key Decisions

### Q: Support old VyOS versions?
**A**: No. Target VyOS 1.5+ only. Clean break is better than maintaining compatibility.

### Q: Show all chains or just forward?
**A**: Start with forward (most common), add input/output later. Most users only need forward filtering.

### Q: IPv6 support?
**A**: Structure is identical to IPv4, so easy to add once IPv4 works. Can add toggle or tabs.

### Q: Custom chains in first version?
**A**: Optional. Add after base chains work. Many users won't need them.

---

## Success Criteria

✅ Can view forward filter rules from VyOS
✅ Can add new rules to forward filter
✅ Can edit existing rules
✅ Can delete rules
✅ Can set default action
✅ Rules persist after commit and page refresh
✅ No errors in console
✅ Commands validated in VyOS CLI before UI implementation
