package com.udusug.voting.election.service;

import com.udusug.voting.election.entity.Election;
import java.time.OffsetDateTime;

public final class ElectionStatusResolver {
    private ElectionStatusResolver() { }

    public static String resolve(Election election, OffsetDateTime now) {
        if (election == null) return "NOT_SCHEDULED";
        if (election.isClosed() || election.getEndTime().isBefore(now)) return "ENDED";
        if (now.isBefore(election.getStartTime())) return "UPCOMING";
        return "ONGOING";
    }
}
