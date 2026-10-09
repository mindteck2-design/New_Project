package com.hal.amms.web;

import com.hal.amms.dao.UserDao;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {

    private final UserDao userDao;

    public RoleController(UserDao userDao) {
        this.userDao = userDao;
    }

    @GetMapping
    public List<Map<String, String>> list() {
        return userDao.listRoleCodes().stream()
                .map(code -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("code", code);
                    m.put("name", code.replace('_', ' '));
                    return m;
                })
                .toList();
    }
}
