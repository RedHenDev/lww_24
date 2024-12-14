// Quest object class
class QuestItem {
    constructor({
        id,
        type,         // 'item' or 'location' or 'message'.
        x, y, z,      // coordinates.
        itemType,     // string describing item type.
        message,      // message to display on completion.
        prerequisite, // id of required quest item (-1 if none).
        visible,      // boolean for initial visibility.
        completed     // boolean tracking completion.
    }) {
        this.id = id;
        this.type = type;
        this.x = parseFloat(x);
        this.y = parseFloat(y);
        this.z = parseFloat(z);
        this.itemType = itemType;
        this.message = message;
        this.prerequisite = parseInt(prerequisite);
        this.visible = visible === 'true';
        this.completed = completed === 'true';
    }
}




// Quest management component
AFRAME.registerComponent('quest-manager', {
    schema: {
        questFile: {type: 'string'} // Path to quest definition file
    },

    init: function() {
        this.quests = new Map();
        this.loadQuests(this.data.questFile);

        const questEntity = document.querySelector('[quest-manager]');
        questEntity.addEventListener('quest-completed', (e) => {
            console.log(`Quest ${e.detail.questId} completed!`);
        });
        questEntity.addEventListener('quest-message', (e) => {
            console.log(`Quest message: ${e.detail.message}`);
        });
    },

    loadQuests: async function(filePath) {
        try {
            const response = await fetch(`./${filePath}`);
            const text = await response.text();
            this.parseQuestFile(text);
        } catch (error) {
            console.error('Error loading quest file:', error);
        }
    },

    parseQuestFile: function(fileContent) {
        // Split file into lines and process each quest definition
        const lines = fileContent.split('\n');
        let currentQuest = {};

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('#')) continue; // Skip empty lines and comments

            if (line.startsWith('[Quest]')) {
                // Save previous quest if exists
                if (currentQuest.id !== undefined) {
                    this.quests.set(currentQuest.id, new QuestItem(currentQuest));
                }
                currentQuest = {}; // Start new quest
                continue;
            }

            const [key, value] = line.split('=').map(s => s.trim());
            if (key && value) {
                currentQuest[key] = value;
            }
        }

        // Save last quest.
        if (currentQuest.id !== undefined) {
            this.quests.set(currentQuest.id, new QuestItem(currentQuest));
        }

        console.log(`Loaded ${this.quests.size} quests`);
        if (this.quests.size>0) autoGenMarkers();
    },

    // Get all currently visible and ready quests
    isQuestReady: function(questId) {
        // Convert questId to string since Map keys are strings
        questId = questId.toString();
        const quest = this.quests.get(questId);
        if (!quest) {
            console.log(`Quest ${questId} not found`);
            return false;
        }
        
        // If no prerequisite, quest is ready
        if (quest.prerequisite === -1) {
            return true;
        }
        
        // Convert prerequisite to string for Map lookup
        const prereq = this.quests.get(quest.prerequisite.toString());
        return prereq && prereq.completed;
    },
    
    getActiveQuests: function() {
        const active = new Map();
        for (const [id, quest] of this.quests) {
            // Convert id to string when getting from Map
            if (!quest.completed && this.isQuestReady(id.toString())) {
                active.set(id, quest);
            }
        }
        return active;
    },

    // Mark a quest as completed
    completeQuest: function(questId) {
        const quest = this.quests.get(questId);
        if (quest && !quest.completed) {
            quest.completed = true;
            if (quest.message) {
                this.el.emit('quest-message', { message: quest.message });
            }
            this.el.emit('quest-completed', { questId: questId });
            console.log(`Completed quest ${questId}: ${quest.message}`);
            
            // Add small delay to ensure quest state is updated before refreshing markers
            setTimeout(() => {
                const qms = document.querySelector('[quest-markers]');
                if (qms && qms.components['quest-markers']) {
                    console.log('Updating markers after quest completion');
                    qms.components['quest-markers'].refreshMarkers();
                }
            }, 100);
        }
    },

    // Check if coordinates match a location quest
    checkLocation: function(x, y, z) {
        const threshold = 5; // Distance threshold for location matching
        for (const [id, quest] of this.getActiveQuests()) {
            if (quest.type === 'location') {
                const distance = Math.sqrt(
                    Math.pow(quest.x - x, 2) +
                    Math.pow(quest.y - y, 2) +
                    Math.pow(quest.z - z, 2)
                );
                if (distance < threshold) {
                    this.completeQuest(id);
                }
            }
        }
    },

    // Check if coordinates match a location quest
    checkPickup: function(x, y, z) {
        const threshold = 5; // Distance threshold for location matching
        for (const [id, quest] of this.getActiveQuests()) {
            if (quest.type === 'item') {
                const distance = Math.sqrt(
                    Math.pow(quest.x - x, 2) +
                    Math.pow(quest.y - y, 2) +
                    Math.pow(quest.z - z, 2)
                );
                if (distance < threshold) {
                    this.completeQuest(id);
                }
            }
        }
    },

    // Check if collected item matches any item quests.
    checkItem: function(itemType) {
        for (const [id, quest] of this.getActiveQuests()) {
            if (quest.type === 'item' && quest.itemType === itemType) {
                this.completeQuest(id);
            }
        }
    }
});

function autoGenMarkers() {
    const qmarkEnt = document.createElement('a-entity');
    qmarkEnt.setAttribute('quest-markers', '');
    document.querySelector('a-scene').appendChild(qmarkEnt);
}