import { v4 as uuidv4 } from "uuid"
import { ActivityFactory, TurnContext } from "botbuilder-core";
import { MessageFactory, TeamsActivityHandler, CardFactory, TeamsInfo } from 'botbuilder';
import { IThingStore, Thing } from "../domain";

export interface BotActivityHandlerDependencies {
    thingStore: IThingStore,
}

const ARGUMENTNAME_THING_NAME = "question"
const ARGUMENTNAME_CHOICE = "choice"
const ACTIONNAME_HELP = "help"
const ACTIONNAME_NEW_THING_FORM = "new thing"
const ACTIONNAME_CREATE_NEW_THING = "create that new thing"

export class BotActivityHandler extends TeamsActivityHandler {
    constructor(private deps: BotActivityHandlerDependencies) {
        super();
        this.onMessage(async (context, next) => await this.handleMessagesAsync(context, next));
    }

    private async handleMessagesAsync(context: TurnContext, nextAsync: () => Promise<void>) {
        //        TurnContext.removeRecipientMention(context.activity);
        switch ((context.activity.text || context.activity.value["text"]).trim().toLowerCase()) {
            case ACTIONNAME_HELP:
                await this.helpActivityAsync(context);
                break;
            case ACTIONNAME_NEW_THING_FORM:
                await this.showNewThingFormAsync(context);
                break;
            case ACTIONNAME_CREATE_NEW_THING:
                await this.createNewThingAsync(context);
                break;
            default:
                await this.helpActivityAsync(context);
        }
        await nextAsync();
    }

    /**
     * Say hello and @ mention the current user.
     */
    private async sendPollActivityAsync(context: TurnContext) {
        const TextEncoder = require('html-entities').XmlEntities;

        const mention = {
            mentioned: context.activity.from,
            text: `<at>${new TextEncoder().encode(context.activity.from.name)}</at>`,
            type: 'mention'
        };

        const replyActivity = MessageFactory.text(`Hi ${mention.text}`);
        replyActivity.entities = [mention];

        await context.sendActivity(replyActivity);
    }

    private async helpActivityAsync(context: TurnContext) {
        const card = CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.0",
            "body": [
                {
                    "type": "TextBlock",
                    "text": `Hi ${context.activity.from.name}. This is a sample app. The possible commands are:`,
                    "wrap": true
                },
                {
                    "type": "ActionSet",
                    "separator": "true",
                    "actions": [
                        {
                            "type": "Action.Submit",
                            "title": "Create a new thing",
                            "data": {
                                "text": ACTIONNAME_NEW_THING_FORM
                            }
                        },
                    ]
                }
            ],

        });

        await context.sendActivity({ attachments: [card] });
    }


    private async showNewThingFormAsync(context: TurnContext) {
        const card = CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.0",
            "body": [
                {
                    "type": "TextBlock",
                    "text": `Create a new thing`,
                    "wrap": true
                },
                {
                    "type": "Input.Text",
                    "id": ARGUMENTNAME_THING_NAME,
                    "placeholder": `Thing name`,
                },
                {
                    "type": "ActionSet",
                    "separator": "true",
                    "actions": [
                        {
                            "type": "Action.Submit",
                            "title": "Create",
                            "data": {
                                "text": ACTIONNAME_CREATE_NEW_THING
                            }
                        }
                    ]
                }
            ],

        });

        await context.sendActivity({ attachments: [card] });
    }

    private async createNewThingAsync(context: TurnContext) {
        const thingName = context.activity.value[ARGUMENTNAME_THING_NAME]
        const choices = Object.keys(context.activity.value).map(key => {
            if (key.substr(0, 6) === ARGUMENTNAME_CHOICE) {
                return context.activity.value[key]
            }
            return ""
        }).filter(entry => entry !== "")
        const thing: Thing = {
            id: uuidv4(),
            name: thingName,
        }
        await this.deps.thingStore.saveThingAsync(thing)
        const things = await this.deps.thingStore.getThingsAsync()

        const card = CardFactory.adaptiveCard({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.0",
            "body": [
                {
                    "type": "TextBlock",
                    "text": `Created thing ${thing.id}. Things are now: ${things.map(thing => thing.name).join(", ")}`,
                    "wrap": true
                },
                {
                    "type": "ActionSet",
                    "separator": "true",
                    "actions": [
                    ]
                }
            ],

        });

        await context.sendActivity({ attachments: [card] });
    }
}