define(["require", "exports"], function (require, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var envelope;
    (function (envelope) {
        // To parse this data:
        //
        //   import { Convert, Envelope } from "./file";
        //
        //   const envelope = Convert.toEnvelope(json);
        //
        // These functions will throw an error if the JSON doesn't
        // match the expected interface, even if the JSON is valid.
        var EnvelopeStatus;
        (function (EnvelopeStatus) {
            EnvelopeStatus["created"] = "created";
            EnvelopeStatus["sent"] = "sent";
            EnvelopeStatus["delivered"] = "delivered";
            EnvelopeStatus["signed"] = "signed";
            EnvelopeStatus["completed"] = "completed";
            EnvelopeStatus["declined"] = "declined";
            EnvelopeStatus["timedout"] = "timedout";
            EnvelopeStatus["always"] = "always";
            EnvelopeStatus["voided"] = "voided";
            EnvelopeStatus["deleted"] = "deleted";
        })(EnvelopeStatus = envelope.EnvelopeStatus || (envelope.EnvelopeStatus = {}));
    })(envelope = exports.envelope || (exports.envelope = {}));
});
