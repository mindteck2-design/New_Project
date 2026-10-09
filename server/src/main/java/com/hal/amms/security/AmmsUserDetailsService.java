package com.hal.amms.security;

import com.hal.amms.dao.UserDao;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AmmsUserDetailsService implements UserDetailsService {

    private final UserDao users;

    public AmmsUserDetailsService(UserDao users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return users.findByUsername(username)
                .map(u -> new UserPrincipal(
                        u.id(),
                        u.username(),
                        u.passwordHash(),
                        u.displayName(),
                        u.roles(),
                        u.active()
                ))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
