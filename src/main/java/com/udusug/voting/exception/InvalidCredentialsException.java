package com.udusug.voting.exception;

public class InvalidCredentialsException extends RuntimeException
{
    public InvalidCredentialsException(String message)
    {
        super(message);
    }
}
