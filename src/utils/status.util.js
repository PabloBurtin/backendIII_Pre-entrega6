import { InvalidStatusError } from "../errors/domain.error.js";

export const assertValidStatus = (status, allowedStatuses) => {
    if (typeof status !== "string" || !allowedStatuses.includes(status)) {
        throw new InvalidStatusError({ received: status, allowed: allowedStatuses });
    }
};

export const assertValidTransition = (from, to, transitions) => {
    const allowed = transitions[from] ?? [];
    if (!allowed.includes(to)) {
        throw new InvalidStatusError({ from, to, allowed, reason: "Transición de estado no permitida" });
    }
};