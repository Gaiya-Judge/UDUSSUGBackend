package com.udusug.voting.exception;

public class VoterIneligibleException extends RuntimeException {
    public VoterIneligibleException(String Message) {
        super(Message);
    }
}
